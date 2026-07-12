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

function makePng(size, color) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = 1 + x * 3;
      row[offset] = color[0];
      row[offset + 1] = color[1];
      row[offset + 2] = color[2];
    }
    rows.push(row);
  }

  const idat = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(process.cwd(), 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });
for (const size of [192, 512]) {
  const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, makePng(size, [249, 115, 22]));
  console.log(`Created ${filePath}`);
}
