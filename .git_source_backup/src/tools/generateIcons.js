const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateDogIconPng(size = 64) {
  const width = size;
  const height = size;

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 0, g = 0, b = 0, a = 0;

      // Ears (two triangles/ovals at top-left and top-right)
      const earLeftDist = Math.sqrt(Math.pow(x - (cx - 16 * (size / 64)), 2) + Math.pow(y - (cy - 16 * (size / 64)), 2));
      const earRightDist = Math.sqrt(Math.pow(x - (cx + 16 * (size / 64)), 2) + Math.pow(y - (cy - 16 * (size / 64)), 2));
      const earRadius = 13 * (size / 64);

      if (earLeftDist < earRadius || earRightDist < earRadius) {
        // Caramel ear outer
        r = 217; g = 138; b = 61; a = 255;
        // Inner ear pinkish
        const innerLeft = Math.sqrt(Math.pow(x - (cx - 16 * (size / 64)), 2) + Math.pow(y - (cy - 15 * (size / 64)), 2));
        const innerRight = Math.sqrt(Math.pow(x - (cx + 16 * (size / 64)), 2) + Math.pow(y - (cy - 15 * (size / 64)), 2));
        if (innerLeft < earRadius * 0.6 || innerRight < earRadius * 0.6) {
          r = 247; g = 186; b = 170;
        }
      }

      // Head circle
      const headRadius = 23 * (size / 64);
      if (dist < headRadius) {
        // Shiba caramel fur
        r = 230; g = 153; b = 75; a = 255;

        // White/cream muzzle and cheeks
        const cheekDist = Math.sqrt(dx * dx + Math.pow(dy - 4 * (size / 64), 2));
        if (dy > -2 * (size / 64) && cheekDist < headRadius * 0.88) {
          r = 255; g = 248; b = 238; // cream white muzzle
        }

        // Eyes (two cute dark circles with shine)
        const eyeLeftDist = Math.sqrt(Math.pow(x - (cx - 8 * (size / 64)), 2) + Math.pow(y - (cy - 2 * (size / 64)), 2));
        const eyeRightDist = Math.sqrt(Math.pow(x - (cx + 8 * (size / 64)), 2) + Math.pow(y - (cy - 2 * (size / 64)), 2));
        const eyeRadius = 3.6 * (size / 64);

        if (eyeLeftDist < eyeRadius || eyeRightDist < eyeRadius) {
          r = 45; g = 30; b = 25; // dark brown eye
          // White shine dot
          const shineLeft = Math.sqrt(Math.pow(x - (cx - 9 * (size / 64)), 2) + Math.pow(y - (cy - 3 * (size / 64)), 2));
          const shineRight = Math.sqrt(Math.pow(x - (cx + 7 * (size / 64)), 2) + Math.pow(y - (cy - 3 * (size / 64)), 2));
          if (shineLeft < 1.3 * (size / 64) || shineRight < 1.3 * (size / 64)) {
            r = 255; g = 255; b = 255;
          }
        }

        // Cute dark nose
        const noseDist = Math.sqrt(dx * dx + Math.pow(dy - 5 * (size / 64), 2));
        if (noseDist < 2.6 * (size / 64)) {
          r = 40; g = 25; b = 20;
        }

        // Cute pink tongue
        if (dy >= 8 * (size / 64) && dy <= 12 * (size / 64) && Math.abs(dx) < 3.5 * (size / 64)) {
          r = 255; g = 140; b = 160;
        }

        // Pink blush cheeks
        const blushLeft = Math.sqrt(Math.pow(x - (cx - 15 * (size / 64)), 2) + Math.pow(y - (cy + 4 * (size / 64)), 2));
        const blushRight = Math.sqrt(Math.pow(x - (cx + 15 * (size / 64)), 2) + Math.pow(y - (cy + 4 * (size / 64)), 2));
        if (blushLeft < 3.8 * (size / 64) || blushRight < 3.8 * (size / 64)) {
          r = 255; g = 175; b = 185;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const assetsDir = path.join(__dirname, '../../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(path.join(assetsDir, 'icon.png'), generateDogIconPng(256));
fs.writeFileSync(path.join(assetsDir, 'tray.png'), generateDogIconPng(32));
console.log('Generated icon.png (256x256) and tray.png (32x32) successfully!');
