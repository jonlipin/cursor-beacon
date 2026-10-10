// Builds the activity sweep's rings in Media/Ring: plain white rings on a transparent background,
// one per band thickness. A Cooldown sweep reveals its texture like a clock hand, so the texture is
// its shape, and the band can only be made thinner or thicker by swapping the texture. The addon
// picks the nearest of these for the size and thickness chosen in the options.
//
// White so SetSwipeColor tints them to any color without mixing in a color of its own; real
// alpha because the game's own ring art is additive glow on black, which a sweep cannot blend.
//
// Each file is named after its band as a percent of the ring's outer radius: Ring015 has a band
// 15% of the radius wide; Ring100 is a solid disc. Keep BANDS in step with ns.RING_BANDS.
//
// Run: node tools/make-ring.js [preview.png]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;            // power of two, as the client wants
const OUTER = 124;           // outer radius in pixels, leaving room for the soft edge
const SAMPLES = 4;           // 4 x 4 supersampling per pixel for smooth edges
const BANDS = [2, 3, 4, 6, 8, 11, 15, 20, 27, 36, 48, 65, 100];

function ringAlpha(bandPercent) {
  const inner = OUTER * (1 - bandPercent / 100);
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
          if (d <= OUTER && d >= inner) hits++;
        }
      }
      alpha[y * SIZE + x] = hits / (SAMPLES * SAMPLES);
    }
  }
  return alpha;
}

// TGA: uncompressed true color, 32 bits, 8 alpha bits, rows from the top (descriptor 0x28).
function tga(alpha) {
  const header = Buffer.alloc(18);
  header[2] = 2;
  header.writeUInt16LE(SIZE, 12);
  header.writeUInt16LE(SIZE, 14);
  header[16] = 32;
  header[17] = 0x28;
  const pixels = Buffer.alloc(SIZE * SIZE * 4, 255);
  for (let i = 0; i < SIZE * SIZE; i++) pixels[i * 4 + 3] = Math.round(alpha[i] * 255);
  return Buffer.concat([header, pixels]);
}

const outDir = path.join(__dirname, '..', 'Media', 'Ring');
fs.mkdirSync(outDir, { recursive: true });
const alphas = [];
for (const band of BANDS) {
  const alpha = ringAlpha(band);
  alphas.push(alpha);
  const name = 'Ring' + String(band).padStart(3, '0') + '.tga';
  fs.writeFileSync(path.join(outDir, name), tga(alpha));
}
console.log('wrote', BANDS.length, 'rings to', outDir);

// A preview strip: every ring, tinted a soft white, over a checkerboard, at a quarter size.
if (process.argv[2]) {
  const cell = SIZE / 4, W = cell * BANDS.length, H = cell;
  const crcTable = new Int32Array(256).map((_, n) => { let k = n; for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1; return k; });
  const crc = b => { let k = -1; for (const v of b) k = crcTable[(k ^ v) & 255] ^ (k >>> 8); return (k ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = Math.floor(x / cell), lx = x % cell;
      let a = 0;
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) a += alphas[k][(y * 4 + sy) * SIZE + lx * 4 + sx];
      a /= 16;
      const g = ((x >> 3) + (y >> 3)) & 1 ? 90 : 60;
      const tint = [237, 235, 224];
      for (let ch = 0; ch < 3; ch++) raw[y * (W * 3 + 1) + 1 + x * 3 + ch] = Math.round(tint[ch] * a + g * (1 - a));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(process.argv[2], Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log('preview', process.argv[2]);
}
