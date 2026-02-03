/**
 * Minimal QR Code Generator
 * Supports alphanumeric mode for WiFi, URLs, and text
 * Based on QR code ISO/IEC 18004 specification
 */
(function() {
  'use strict';

  // Error correction levels
  const EC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 };

  // Version capacity for byte mode (level M)
  const VERSION_CAPACITY = [
    0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213,
    251, 287, 331, 362, 412, 450, 504, 560, 624, 666,
    711, 779, 857, 911, 997, 1059, 1125, 1190, 1264
  ];

  // Generator polynomials for error correction
  const GEN_POLYS = {
    7: [87, 229, 146, 149, 238, 102, 21],
    10: [251, 67, 46, 61, 118, 70, 64, 94, 32, 45],
    13: [74, 152, 176, 100, 86, 100, 106, 104, 130, 218, 206, 140, 78],
    15: [8, 183, 61, 91, 202, 37, 51, 58, 58, 237, 140, 124, 5, 99, 105],
    16: [120, 104, 107, 109, 102, 161, 76, 3, 91, 191, 147, 169, 182, 194, 225, 120],
    17: [43, 139, 206, 78, 43, 239, 123, 206, 214, 147, 24, 99, 150, 39, 243, 163, 136],
    18: [215, 234, 158, 94, 184, 97, 118, 170, 79, 187, 152, 148, 252, 179, 5, 98, 96, 153],
    20: [17, 60, 79, 50, 61, 163, 26, 187, 202, 180, 221, 225, 83, 239, 156, 164, 212, 212, 188, 190],
    22: [210, 171, 247, 242, 93, 230, 14, 109, 221, 53, 200, 74, 8, 172, 98, 80, 219, 134, 160, 105, 165, 231],
    24: [229, 121, 135, 48, 211, 117, 251, 126, 159, 180, 169, 152, 192, 226, 228, 218, 111, 0, 117, 232, 87, 96, 227, 21],
    26: [173, 125, 158, 2, 103, 182, 118, 17, 145, 201, 111, 28, 165, 53, 161, 21, 245, 142, 13, 102, 48, 227, 153, 145, 218, 70],
    28: [168, 223, 200, 104, 224, 234, 108, 180, 110, 190, 195, 147, 205, 27, 232, 201, 21, 43, 245, 87, 42, 195, 212, 119, 242, 37, 9, 123],
    30: [41, 173, 145, 152, 216, 31, 179, 182, 50, 48, 110, 86, 239, 96, 222, 125, 42, 173, 226, 193, 224, 130, 156, 37, 251, 216, 238, 40, 192, 180]
  };

  // Galois field tables
  const GF_EXP = new Array(512);
  const GF_LOG = new Array(256);

  // Initialize Galois field tables
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 256) x ^= 285;
    }
    for (let i = 255; i < 512; i++) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  // Get version for data length
  function getVersion(dataLen) {
    for (let v = 1; v <= 29; v++) {
      if (VERSION_CAPACITY[v] >= dataLen) return v;
    }
    return 29;
  }

  // Get module count for version
  function getModuleCount(version) {
    return version * 4 + 17;
  }

  // Generate error correction codewords
  function generateEC(data, ecLen) {
    const poly = GEN_POLYS[ecLen];
    if (!poly) return new Uint8Array(ecLen);

    const msg = new Uint8Array(data.length + ecLen);
    msg.set(data);

    for (let i = 0; i < data.length; i++) {
      const coef = msg[i];
      if (coef !== 0) {
        for (let j = 0; j < poly.length; j++) {
          msg[i + j + 1] ^= gfMul(poly[j], coef);
        }
      }
    }

    return msg.slice(data.length);
  }

  // Encode data to bytes
  function encodeData(text) {
    const bytes = [];

    // Byte mode indicator (0100)
    bytes.push(0x40 | (text.length >> 4));
    bytes.push(((text.length & 0x0f) << 4) | (text.charCodeAt(0) >> 4));

    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (i < text.length - 1) {
        bytes.push(((c & 0x0f) << 4) | (text.charCodeAt(i + 1) >> 4));
      } else {
        bytes.push((c & 0x0f) << 4);
      }
    }

    return new Uint8Array(bytes);
  }

  // Simple UTF-8 encoding
  function utf8Encode(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else if (c < 2048) {
        bytes.push(192 | (c >> 6));
        bytes.push(128 | (c & 63));
      } else if (c < 65536) {
        bytes.push(224 | (c >> 12));
        bytes.push(128 | ((c >> 6) & 63));
        bytes.push(128 | (c & 63));
      }
    }
    return bytes;
  }

  // Create QR code matrix
  function createQR(text, ecLevel = 'M') {
    const utf8Bytes = utf8Encode(text);
    const version = getVersion(utf8Bytes.length + 3);
    const size = getModuleCount(version);

    // Create matrix
    const matrix = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(null);
    }

    // Add finder patterns
    addFinderPattern(matrix, 0, 0);
    addFinderPattern(matrix, size - 7, 0);
    addFinderPattern(matrix, 0, size - 7);

    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = matrix[i][6] = i % 2 === 0;
    }

    // Add alignment patterns for version > 1
    if (version > 1) {
      const positions = getAlignmentPositions(version);
      for (let i = 0; i < positions.length; i++) {
        for (let j = 0; j < positions.length; j++) {
          const x = positions[i];
          const y = positions[j];
          if (matrix[y][x] === null) {
            addAlignmentPattern(matrix, x, y);
          }
        }
      }
    }

    // Reserve format info areas
    for (let i = 0; i < 8; i++) {
      if (matrix[8][i] === null) matrix[8][i] = false;
      if (matrix[i][8] === null) matrix[i][8] = false;
      if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
      if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
    }
    matrix[8][8] = false;
    matrix[size - 8][8] = true; // Dark module

    // Reserve version info for version >= 7
    if (version >= 7) {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
          matrix[size - 11 + j][i] = false;
          matrix[i][size - 11 + j] = false;
        }
      }
    }

    // Encode data
    const data = encodeDataWithEC(utf8Bytes, version, EC_LEVELS[ecLevel]);

    // Place data in matrix
    placeData(matrix, data, size);

    // Apply mask (using mask 0 for simplicity)
    applyMask(matrix, 0, size);

    // Add format info
    addFormatInfo(matrix, EC_LEVELS[ecLevel], 0, size);

    // Add version info for version >= 7
    if (version >= 7) {
      addVersionInfo(matrix, version, size);
    }

    return matrix;
  }

  function addFinderPattern(matrix, x, y) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && py >= 0 && px < matrix.length && py < matrix.length) {
          if (dx === -1 || dx === 7 || dy === -1 || dy === 7) {
            matrix[py][px] = false;
          } else if (dx === 0 || dx === 6 || dy === 0 || dy === 6) {
            matrix[py][px] = true;
          } else if (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) {
            matrix[py][px] = true;
          } else {
            matrix[py][px] = false;
          }
        }
      }
    }
  }

  function addAlignmentPattern(matrix, x, y) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        matrix[y + dy][x + dx] = (absX === 2 || absY === 2 || (dx === 0 && dy === 0));
      }
    }
  }

  function getAlignmentPositions(version) {
    if (version === 1) return [];
    const intervals = Math.floor(version / 7) + 1;
    const size = getModuleCount(version);
    const step = Math.round((size - 13) / intervals);
    const positions = [6];
    for (let i = 1; i <= intervals; i++) {
      positions.push(size - 7 - (intervals - i) * step);
    }
    return positions;
  }

  function encodeDataWithEC(utf8Bytes, version, ecLevel) {
    // Simplified encoding - byte mode
    const dataCapacity = getDataCapacity(version, ecLevel);  // Data codewords capacity
    const ecBytes = getECBytes(version, ecLevel);            // EC codewords count

    const data = new Uint8Array(dataCapacity);
    let pos = 0;

    // Mode indicator (4 bits) + character count (8 bits for version 1-9, 16 for 10+)
    const countBits = version < 10 ? 8 : 16;
    const len = utf8Bytes.length;

    // Byte mode = 0100
    data[pos++] = (0x40 | (len >> (countBits - 4))) & 0xff;

    if (version < 10) {
      data[pos++] = ((len & 0x0f) << 4) | ((utf8Bytes[0] || 0) >> 4);
    } else {
      data[pos++] = (len >> 4) & 0xff;
      data[pos++] = ((len & 0x0f) << 4) | ((utf8Bytes[0] || 0) >> 4);
    }

    for (let i = 0; i < len; i++) {
      const curr = utf8Bytes[i] || 0;
      const next = utf8Bytes[i + 1] || 0;
      data[pos++] = ((curr & 0x0f) << 4) | (next >> 4);
    }

    // Add terminator and padding
    if (pos < dataCapacity) data[pos++] = 0;
    let padToggle = true;
    while (pos < dataCapacity) {
      data[pos++] = padToggle ? 0xec : 0x11;
      padToggle = !padToggle;
    }

    // Generate error correction for all data codewords
    const ecData = generateEC(data, ecBytes);

    // Combine data and EC codewords
    const result = new Uint8Array(dataCapacity + ecBytes);
    result.set(data);
    result.set(ecData, dataCapacity);

    return result;
  }

  function getDataCapacity(version, ecLevel) {
    // Simplified capacity table
    const caps = [
      [0, 0, 0, 0],
      [19, 16, 13, 9],
      [34, 28, 22, 16],
      [55, 44, 34, 26],
      [80, 64, 48, 36],
      [108, 86, 62, 46],
      [136, 108, 76, 60],
      [156, 124, 88, 66],
      [194, 154, 110, 86],
      [232, 182, 132, 100],
      [274, 216, 154, 122]
    ];
    if (version <= 10) return caps[version][ecLevel];
    return Math.floor(caps[10][ecLevel] * (version / 10) * 1.2);
  }

  function getECBytes(version, ecLevel) {
    const ecPerBlock = [
      [0, 0, 0, 0],
      [7, 10, 13, 17],
      [10, 16, 22, 28],
      [15, 26, 18, 22],
      [20, 18, 26, 16],
      [26, 24, 18, 22],
      [18, 16, 24, 28],
      [20, 18, 18, 26],
      [24, 22, 22, 26],
      [30, 22, 20, 24],
      [18, 26, 24, 28]
    ];
    if (version <= 10) return ecPerBlock[version][ecLevel];
    return ecPerBlock[10][ecLevel];
  }

  function placeData(matrix, data, size) {
    let bitIndex = 0;
    let up = true;
    const totalBits = data.length * 8;

    for (let col = size - 1; col >= 0; col -= 2) {
      if (col === 6) col--;

      for (let i = 0; i < size; i++) {
        const row = up ? size - 1 - i : i;

        for (let c = 0; c < 2; c++) {
          const x = col - c;
          if (matrix[row][x] === null) {
            const bit = bitIndex < totalBits ?
              (data[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1 : 0;
            matrix[row][x] = bit === 1;
            bitIndex++;
          }
        }
      }
      up = !up;
    }
  }

  function applyMask(matrix, maskNum, size) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isDataModule(matrix, x, y, size)) {
          let mask = false;
          switch (maskNum) {
            case 0: mask = (y + x) % 2 === 0; break;
            case 1: mask = y % 2 === 0; break;
            case 2: mask = x % 3 === 0; break;
            case 3: mask = (y + x) % 3 === 0; break;
            case 4: mask = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; break;
            case 5: mask = (y * x) % 2 + (y * x) % 3 === 0; break;
            case 6: mask = ((y * x) % 2 + (y * x) % 3) % 2 === 0; break;
            case 7: mask = ((y + x) % 2 + (y * x) % 3) % 2 === 0; break;
          }
          if (mask) matrix[y][x] = !matrix[y][x];
        }
      }
    }
  }

  function isDataModule(matrix, x, y, size) {
    // Check if this is a data module (not part of function patterns)
    // Finder patterns
    if (x < 9 && y < 9) return false;
    if (x < 9 && y >= size - 8) return false;
    if (x >= size - 8 && y < 9) return false;

    // Timing patterns
    if (x === 6 || y === 6) return false;

    return true;
  }

  function addFormatInfo(matrix, ecLevel, mask, size) {
    const formatBits = getFormatBits(ecLevel, mask);

    // Place format info
    for (let i = 0; i < 15; i++) {
      const bit = (formatBits >> (14 - i)) & 1;
      const val = bit === 1;

      if (i < 6) {
        matrix[i][8] = val;
      } else if (i < 8) {
        matrix[i + 1][8] = val;
      } else {
        matrix[8][14 - i] = val;
      }

      if (i < 8) {
        matrix[8][size - 1 - i] = val;
      } else {
        matrix[size - 15 + i][8] = val;
      }
    }
  }

  function getFormatBits(ecLevel, mask) {
    // Pre-computed format strings
    const formats = [
      [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
      [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0],
      [0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed],
      [0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b]
    ];
    return formats[ecLevel][mask];
  }

  function addVersionInfo(matrix, version, size) {
    if (version < 7) return;

    // Pre-computed version info (simplified)
    const versionBits = getVersionBits(version);

    for (let i = 0; i < 18; i++) {
      const bit = (versionBits >> i) & 1;
      const val = bit === 1;
      const x = Math.floor(i / 3);
      const y = i % 3 + size - 11;
      matrix[x][y] = val;
      matrix[y][x] = val;
    }
  }

  function getVersionBits(version) {
    // Pre-computed version info bits
    const versionInfo = [
      0, 0, 0, 0, 0, 0, 0,
      0x07c94, 0x085bc, 0x09a99, 0x0a4d3, 0x0bbf6, 0x0c762, 0x0d847,
      0x0e60d, 0x0f928, 0x10b78, 0x1145d, 0x12a17, 0x13532, 0x149a6,
      0x15683, 0x168c9, 0x177ec, 0x18ec4, 0x191e1, 0x1afab, 0x1b08e,
      0x1cc1a, 0x1d33f, 0x1ed75, 0x1f250, 0x209d5, 0x216f0, 0x228ba,
      0x2379f, 0x24b0b, 0x2542e, 0x26a64, 0x27541, 0x28c69
    ];
    return versionInfo[version] || 0;
  }

  // Render to canvas
  function renderToCanvas(canvas, matrix, options = {}) {
    const {
      moduleSize = 8,
      margin = 4,
      darkColor = '#000000',
      lightColor = '#ffffff'
    } = options;

    const size = matrix.length;
    const canvasSize = (size + margin * 2) * moduleSize;

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Modules
    ctx.fillStyle = darkColor;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (matrix[y][x]) {
          ctx.fillRect(
            (x + margin) * moduleSize,
            (y + margin) * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
  }

  // Export
  window.QRCode = {
    create: createQR,
    render: renderToCanvas
  };
})();
