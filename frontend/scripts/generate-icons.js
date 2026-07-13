import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

import { createCanvas, loadImage } from 'canvas';

async function generateIcon(size) {
  const srcPath = path.join(process.cwd(), 'public', 'logo.png');
  const image = await loadImage(srcPath);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const scale = Math.min(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  ctx.drawImage(image, x, y, width, height);
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(process.cwd(), 'public', 'icons', `icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Created ${filePath}`);
}

async function main() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const size of [192, 512]) {
    await generateIcon(size);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
