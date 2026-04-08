import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const svg = readFileSync(join(root, "app/icon.svg"));

// Render at 32x32 and 16x16 as PNG buffers
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
const png16 = await sharp(svg).resize(16, 16).png().toBuffer();

// Build ICO with two PNG images embedded
function buildIco(images) {
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  let currentOffset = dataOffset;
  const dirEntries = images.map(({ buf, size }) => {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // image data size
    entry.writeUInt32LE(currentOffset, 12); // image data offset
    currentOffset += buf.length;
    return entry;
  });

  return Buffer.concat([header, ...dirEntries, ...images.map((i) => i.buf)]);
}

const ico = buildIco([
  { buf: png32, size: 32 },
  { buf: png16, size: 16 },
]);

writeFileSync(join(root, "app/favicon.ico"), ico);
console.log("favicon.ico written (32x32 + 16x16)");
