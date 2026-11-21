#!/usr/bin/env node
/**
 * make-icons.mjs — generate the PWA PNG icons with no external dependencies.
 *
 * Rasterises the mark (rounded tile, gold crescent, star) with 3x3
 * supersampling and writes standards-compliant RGBA PNGs using Node's zlib.
 *
 *   node scripts/make-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, '..', 'assets');

/* ------------------------------------------------------------ PNG encoder */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Encode an RGBA pixel buffer (width*height*4) as a PNG. */
function encodePNG(rgba, width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Raw scanlines, each prefixed with filter byte 0.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- drawing */

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

const BG_A = hex('#1a6455');
const BG_B = hex('#08241f');
const GLOW = hex('#d4a94a');
const GOLD_TOP = hex('#f0d79a');
const GOLD_BOT = hex('#d4a94a');
const STAR = hex('#e5c579');

/** Inside a rounded rectangle occupying [0,size] with radius r. */
function inRoundedRect(x, y, size, r) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Point inside a regular star polygon. */
function inStar(x, y, cx, cy, outer, inner, points = 5, rotation = -Math.PI / 2) {
  const verts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    verts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Render the icon at a given size.
 * @param {number} size    output edge length in pixels
 * @param {number} content scale of the artwork within the tile (1 = full bleed)
 * @param {string} padColour background shown outside the artwork when scaled
 */
function render(size, content = 1, padColour = '#0f3d33') {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3; // supersampling grid per axis
  const pad = hex(padColour);

  // Artwork coordinate space.
  const art = size * content;
  const offset = (size - art) / 2;
  const radius = art * 0.2266;

  const crescentCx = offset + art * 0.488;
  const crescentCy = offset + art * 0.516;
  const crescentR = art * 0.254;
  const cutCx = offset + art * 0.586;
  const cutCy = offset + art * 0.465;
  const cutR = art * 0.219;

  const starCx = offset + art * 0.727;
  const starCy = offset + art * 0.3;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;

          if (!inRoundedRect(x, y, size, offset > 0 ? 0 : radius) && content >= 1) {
            continue; // outside the rounded tile
          }
          if (content < 1 && Math.hypot(x - size / 2, y - size / 2) > size / 2) {
            continue;
          }

          // Base tile / padding colour.
          let col = content >= 1 ? mix(BG_A, BG_B, Math.min(1, (x / size) * 0.55 + (y / size) * 0.45)) : pad;

          if (content >= 1) {
            // Gold glow, top right.
            const gd = Math.hypot(x - size * 0.78, y - size * 0.16) / (size * 0.62);
            if (gd < 1) col = mix(col, GLOW, 0.34 * (1 - gd) ** 2);
          }

          // Crescent: gold disc minus an offset disc.
          const d1 = Math.hypot(x - crescentCx, y - crescentCy);
          const d2 = Math.hypot(x - cutCx, y - cutCy);
          if (d1 <= crescentR && d2 > cutR) {
            const t = Math.min(1, Math.max(0, (y - (crescentCy - crescentR)) / (crescentR * 2)));
            col = mix(GOLD_TOP, GOLD_BOT, t);
          }

          // Star.
          if (inStar(x, y, starCx, starCy, art * 0.072, art * 0.03)) {
            col = STAR;
          }

          r += col[0];
          g += col[1];
          b += col[2];
          a += 255;
        }
      }

      const total = SS * SS;
      const idx = (py * size + px) * 4;
      if (a === 0) {
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
      } else {
        const covered = a / 255;
        rgba[idx] = Math.round(r / covered);
        rgba[idx + 1] = Math.round(g / covered);
        rgba[idx + 2] = Math.round(b / covered);
        rgba[idx + 3] = Math.round(a / total);
      }
    }
  }

  return rgba;
}

/* ------------------------------------------------------------------ main */

mkdirSync(ASSETS, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, content: 1 },
  { file: 'icon-512.png', size: 512, content: 1 },
  { file: 'icon-maskable-512.png', size: 512, content: 0.78 },
];

for (const { file, size, content } of targets) {
  const rgba = render(size, content);
  const png = encodePNG(rgba, size, size);
  writeFileSync(resolve(ASSETS, file), png);
  console.log(`wrote assets/${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
