// Builds Media/ActivityRing.tga: a plain white ring on a transparent background, for the activity
// sweep. A Cooldown sweep reveals its texture like a clock hand, so the texture is its shape; white
// means SetSwipeColor can tint it to any colour without mixing in a colour of its own, and real
// alpha means no black square behind it (the game's ring art is additive glow on black, which a
// sweep cannot blend).
//
// Run: node tools/make-ring.js   (writes the TGA, and a PNG preview on a checkerboard to look at)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;            // power of two, as the client wants
const OUTER = 124;           // ring outer radius, pixels
const INNER = 104;           // ring inner radius, pixels
const SAMPLES = 4;           // 4 x 4 supersampling per pixel for smooth edges

const c = (SIZE - 1) / 2;
const alpha = new Float64Array(SIZE * SIZE);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let hits = 0;
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const px = x + (sx + 0.5) / SAMPLES - 0.5 - c;
        const py = y + (sy + 0.5) / SAMPLES - 0.5 - c;
        const d = Math.sqrt(px * px + py * py);
        if (d <= OUTER && d >= INNER) hits++;
      }
    }
    alpha[y * SIZE + x] = hits / (SAMPLES * SAMPLES);
  }
}

// TGA: uncompressed true colour, 32 bits, 8 alpha bits, rows from the top (descriptor 0x28).
const header = Buffer.alloc(18);
header[2] = 2;
header.writeUInt16LE(SIZE, 12);
header.writeUInt16LE(SIZE, 14);
header[16] = 32;
header[17] = 0x28;
const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < SIZE * SIZE; i++) {
  pixels[i * 4] = 255;      // B
  pixels[i * 4 + 1] = 255;  // G
  pixels[i * 4 + 2] = 255;  // R
  pixels[i * 4 + 3] = Math.round(alpha[i] * 255);
}
const outDir = path.join(__dirname, '..', 'Media');
fs.mkdirSync(outDir, { recursive: true });
const tgaPath = path.join(outDir, 'ActivityRing.tga');
fs.writeFileSync(tgaPath, Buffer.concat([header, pixels]));

// A preview: the ring tinted gold over a checkerboard, so transparency shows.
const crcTable = new Int32Array(256).map((_, n) => { let k = n; for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1; return k; });
const crc = b => { let k = -1; for (const v of b) k = crcTable[(k ^ v) & 255] ^ (k >>> 8); return (k ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 3 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    const g = ((x >> 3) + (y >> 3)) & 1 ? 90 : 60;
    const a = alpha[y * SIZE + x];
    const tint = [255, 216, 64];
    for (let ch = 0; ch < 3; ch++) raw[y * (SIZE * 3 + 1) + 1 + x * 3 + ch] = Math.round(tint[ch] * a + g * (1 - a));
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
const previewPath = process.argv[2] || path.join(require('os').tmpdir(), 'ActivityRing-preview.png');
fs.writeFileSync(previewPath, png);

console.log('wrote', tgaPath, (18 + pixels.length) + ' bytes', SIZE + 'x' + SIZE);
console.log('preview', previewPath);
