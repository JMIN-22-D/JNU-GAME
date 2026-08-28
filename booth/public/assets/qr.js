/* Minimal QR encoder — byte mode, error-correction level M, versions 1-10.
 * Enough for a LAN URL like http://192.168.0.12:5174/s/0820120455-4821
 *
 * qrMatrix(text) -> array of rows of 0/1, including the 4-module quiet zone.
 * Throws if the text does not fit in version 10.
 */
(function (global) {
  'use strict';

  // ---- GF(256) tables, primitive polynomial 0x11d ----
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gmul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  // generator polynomial for `n` error-correction codewords
  function genPoly(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ng = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) {
        ng[j] ^= g[j];
        ng[j + 1] ^= gmul(g[j], EXP[i]);
      }
      g = ng;
    }
    return g;
  }

  function rsEncode(data, ecLen) {
    var gen = genPoly(ecLen);
    var res = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      for (var j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
    }
    return res;
  }

  /* Per-version data for EC level M:
   * [ total codewords, ec codewords per block, group1 blocks, group1 data cw,
   *   group2 blocks, group2 data cw ] */
  var VER = {
    1:  [26,   10, 1, 16,  0, 0],
    2:  [44,   16, 1, 28,  0, 0],
    3:  [70,   26, 1, 44,  0, 0],
    4:  [100,  18, 2, 32,  0, 0],
    5:  [134,  24, 2, 43,  0, 0],
    6:  [172,  16, 4, 27,  0, 0],
    7:  [196,  18, 4, 31,  0, 0],
    8:  [242,  22, 2, 38,  2, 39],
    9:  [292,  22, 3, 36,  2, 37],
    10: [346,  26, 4, 43,  1, 44]
  };

  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  function dataCapacity(v) {
    var d = VER[v];
    return d[2] * d[3] + d[4] * d[5];
  }

  // character-count indicator is 8 bits for byte mode in versions 1-9, 16 from 10
  function countBits(v) { return v < 10 ? 8 : 16; }

  function pickVersion(byteLen) {
    for (var v = 1; v <= 10; v++) {
      var bits = 4 + countBits(v) + byteLen * 8;
      if (bits <= dataCapacity(v) * 8) return v;
    }
    throw new Error('QR: text too long (' + byteLen + ' bytes)');
  }

  function utf8(text) {
    var out = [], i, c;
    for (i = 0; i < text.length; i++) {
      c = text.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c >= 0xd800 && c <= 0xdbff) {
        var c2 = text.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63),
                 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return out;
  }

  function buildCodewords(text) {
    var bytes = utf8(text);
    var v = pickVersion(bytes.length);
    var cap = dataCapacity(v);

    // bit stream: mode 0100, length, data, terminator, pad
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }

    put(4, 4);
    put(bytes.length, countBits(v));
    for (var i = 0; i < bytes.length; i++) put(bytes[i], 8);

    var room = cap * 8;
    for (var t = 0; t < 4 && bits.length < room; t++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    var cw = [];
    for (var b = 0; b < bits.length; b += 8) {
      var byte = 0;
      for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[b + k];
      cw.push(byte);
    }
    var pads = [0xec, 0x11], p = 0;
    while (cw.length < cap) cw.push(pads[p++ % 2]);

    // split into blocks, interleave data then EC
    var d = VER[v], ecLen = d[1];
    var blocks = [], ecBlocks = [], pos = 0, i2;
    for (i2 = 0; i2 < d[2]; i2++) { blocks.push(cw.slice(pos, pos + d[3])); pos += d[3]; }
    for (i2 = 0; i2 < d[4]; i2++) { blocks.push(cw.slice(pos, pos + d[5])); pos += d[5]; }
    for (i2 = 0; i2 < blocks.length; i2++) ecBlocks.push(rsEncode(blocks[i2], ecLen));

    var out = [], maxData = Math.max(d[3], d[5] || 0), c;
    for (c = 0; c < maxData; c++) {
      for (i2 = 0; i2 < blocks.length; i2++) {
        if (c < blocks[i2].length) out.push(blocks[i2][c]);
      }
    }
    for (c = 0; c < ecLen; c++) {
      for (i2 = 0; i2 < ecBlocks.length; i2++) out.push(ecBlocks[i2][c]);
    }
    return { version: v, codewords: out };
  }

  // ---- matrix ----
  function makeMatrix(version, codewords, mask) {
    var size = version * 4 + 17;
    var m = [], reserved = [], i, j;
    for (i = 0; i < size; i++) {
      m.push(new Array(size).fill(0));
      reserved.push(new Array(size).fill(false));
    }

    function setF(r, c, v) { m[r][c] = v; reserved[r][c] = true; }

    // finder patterns + separators
    function finder(r0, c0) {
      for (var r = -1; r <= 7; r++) {
        for (var c = -1; c <= 7; c++) {
          var rr = r0 + r, cc = c0 + c;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                   (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                   (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setF(rr, cc, on ? 1 : 0);
        }
      }
    }
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    // timing patterns
    for (i = 8; i < size - 8; i++) {
      setF(6, i, i % 2 === 0 ? 1 : 0);
      setF(i, 6, i % 2 === 0 ? 1 : 0);
    }

    // alignment patterns
    var al = ALIGN[version];
    for (i = 0; i < al.length; i++) {
      for (j = 0; j < al.length; j++) {
        var ar = al[i], ac = al[j];
        if (reserved[ar][ac]) continue;           // skips the finder corners
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var on2 = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setF(ar + dr, ac + dc, on2 ? 1 : 0);
          }
        }
      }
    }

    // dark module + format-info area reservation
    setF(size - 8, 8, 1);
    for (i = 0; i < 9; i++) {
      if (!reserved[8][i]) setF(8, i, 0);
      if (!reserved[i][8]) setF(i, 8, 0);
    }
    for (i = 0; i < 8; i++) {
      if (!reserved[8][size - 1 - i]) setF(8, size - 1 - i, 0);
      if (!reserved[size - 1 - i][8]) setF(size - 1 - i, 8, 0);
    }

    // data placement, two columns at a time, bottom-up then top-down
    var bitIdx = 0, total = codewords.length * 8;
    function bitAt(n) {
      if (n >= total) return 0;
      return (codewords[n >> 3] >> (7 - (n & 7))) & 1;
    }
    var up = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;                       // skip the vertical timing column
      for (var n = 0; n < size; n++) {
        var row = up ? size - 1 - n : n;
        for (var s = 0; s < 2; s++) {
          var cc2 = col - s;
          if (reserved[row][cc2]) continue;
          var bit = bitAt(bitIdx++);
          if (maskFn(mask, row, cc2)) bit ^= 1;
          m[row][cc2] = bit;
        }
      }
      up = !up;
    }
    return { m: m, reserved: reserved, size: size };
  }

  function maskFn(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
    return false;
  }

  // format info: EC level M = 00, 15 bits with BCH(15,5) and mask 0x5412
  function formatBits(mask) {
    var data = (0 << 3) | mask;                   // 00 = level M
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >> 9) & 1) * 0x537);
    var v = (((data << 10) | rem) ^ 0x5412);
    return v;
  }

  // Format info placement. m is indexed [row][col].
  //
  // Getting this transposed still round-trips through a matching decoder, but
  // every real scanner rejects the code because it cannot read the mask or the
  // error-correction level. Verified against a reference QR: reading a known
  // good code with this mapping yields a valid BCH codeword, the transpose does
  // not.
  function placeFormat(m, size, mask) {
    var f = formatBits(mask), i;

    // copy 1 - around the top-left finder
    for (i = 0; i <= 5; i++) m[i][8] = (f >> i) & 1;   // rows 0-5, column 8
    m[7][8] = (f >> 6) & 1;
    m[8][8] = (f >> 7) & 1;
    m[8][7] = (f >> 8) & 1;
    for (i = 9; i <= 14; i++) m[8][14 - i] = (f >> i) & 1;  // row 8, columns 5-0

    // copy 2 - split between top-right and bottom-left
    for (i = 0; i <= 7; i++) m[8][size - 1 - i] = (f >> i) & 1;
    for (i = 8; i <= 14; i++) m[size - 15 + i][8] = (f >> i) & 1;

    m[size - 8][8] = 1;                           // dark module
  }

  // ---- mask scoring (spec penalty rules) ----
  function penalty(m, size) {
    var score = 0, r, c, i, run, prev, dark = 0;

    // rule 1: runs of 5+
    for (r = 0; r < size; r++) {
      run = 1; prev = m[r][0];
      for (c = 1; c < size; c++) {
        if (m[r][c] === prev) { run++; }
        else { if (run >= 5) score += 3 + (run - 5); run = 1; prev = m[r][c]; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    for (c = 0; c < size; c++) {
      run = 1; prev = m[0][c];
      for (r = 1; r < size; r++) {
        if (m[r][c] === prev) { run++; }
        else { if (run >= 5) score += 3 + (run - 5); run = 1; prev = m[r][c]; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }

    // rule 2: 2x2 blocks
    for (r = 0; r < size - 1; r++) {
      for (c = 0; c < size - 1; c++) {
        var v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }
    }

    // rule 3: 1:1:3:1:1 patterns with 4 light modules on one side
    var p1 = [1,0,1,1,1,0,1,0,0,0,0], p2 = [0,0,0,0,1,0,1,1,1,0,1];
    function match(get, len, pat) {
      var hits = 0;
      for (var s = 0; s + pat.length <= len; s++) {
        var ok = true;
        for (var k = 0; k < pat.length; k++) if (get(s + k) !== pat[k]) { ok = false; break; }
        if (ok) hits++;
      }
      return hits;
    }
    for (r = 0; r < size; r++) {
      (function (rr) {
        var get = function (i) { return m[rr][i]; };
        score += 40 * (match(get, size, p1) + match(get, size, p2));
      })(r);
    }
    for (c = 0; c < size; c++) {
      (function (cc) {
        var get = function (i) { return m[i][cc]; };
        score += 40 * (match(get, size, p1) + match(get, size, p2));
      })(c);
    }

    // rule 4: dark/light balance
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) if (m[r][c]) dark++;
    var pct = dark * 100 / (size * size);
    score += 10 * Math.floor(Math.abs(pct - 50) / 5);
    return score;
  }

  function qrMatrix(text, quiet) {
    if (quiet === undefined) quiet = 4;
    var enc = buildCodewords(text);
    var best = null, bestScore = Infinity;

    for (var mask = 0; mask < 8; mask++) {
      var built = makeMatrix(enc.version, enc.codewords, mask);
      placeFormat(built.m, built.size, mask);
      var s = penalty(built.m, built.size);
      if (s < bestScore) { bestScore = s; best = built; }
    }

    var size = best.size, out = [], r, c;
    var w = size + quiet * 2;
    for (r = 0; r < w; r++) {
      var row = new Array(w).fill(0);
      if (r >= quiet && r < quiet + size) {
        for (c = 0; c < size; c++) row[quiet + c] = best.m[r - quiet][c];
      }
      out.push(row);
    }
    out.version = enc.version;
    return out;
  }

  global.qrMatrix = qrMatrix;
})(window);
