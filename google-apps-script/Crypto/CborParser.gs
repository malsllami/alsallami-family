// فاكّ تشفير CBOR نقي (جزء كافٍ لتحليل بنى WebAuthn: attestationObject ومفاتيح COSE)
// Minimal pure-JS CBOR decoder — enough to parse WebAuthn attestationObject + COSE keys
//
// يدعم: أعداد صحيحة موجبة/سالبة (Major type 0/1)، سلاسل بايتات (2)، سلاسل نصية (3)،
// مصفوفات (4)، خرائط (5)، وقيم بسيطة true/false/null (7). لا يدعم Floats — غير مطلوبة هنا.

function cborDecodeBytes_(byteArray) {
  const ctx = { bytes: byteArray, pos: 0 };
  return cborDecodeItem_(ctx);
}

function cborDecodeItem_(ctx) {
  const initial = ctx.bytes[ctx.pos++] & 0xff;
  const majorType = initial >> 5;
  const infoBits = initial & 0x1f;
  const length = cborReadLength_(ctx, infoBits);

  switch (majorType) {
    case 0: // unsigned integer
      return length;
    case 1: // negative integer
      return -1 - length;
    case 2: { // byte string
      const val = ctx.bytes.slice(ctx.pos, ctx.pos + length);
      ctx.pos += length;
      return val;
    }
    case 3: { // text string
      const raw = ctx.bytes.slice(ctx.pos, ctx.pos + length);
      ctx.pos += length;
      return bytesToUtf8_(raw);
    }
    case 4: { // array
      const arr = [];
      for (let i = 0; i < length; i++) arr.push(cborDecodeItem_(ctx));
      return arr;
    }
    case 5: { // map
      const map = {};
      for (let i = 0; i < length; i++) {
        const key = cborDecodeItem_(ctx);
        map[key] = cborDecodeItem_(ctx);
      }
      return map;
    }
    case 7: // بسيطة: false/true/null فقط (لا حاجة لدعم Floats في بنى WebAuthn المستخدمة هنا)
      if (infoBits === 20) return false;
      if (infoBits === 21) return true;
      if (infoBits === 22) return null;
      return length;
    default:
      throw new Error('نوع CBOR غير مدعوم: ' + majorType);
  }
}

function cborReadLength_(ctx, infoBits) {
  if (infoBits < 24) return infoBits;
  if (infoBits === 24) return ctx.bytes[ctx.pos++] & 0xff;
  if (infoBits === 25) {
    const v = ((ctx.bytes[ctx.pos] & 0xff) << 8) | (ctx.bytes[ctx.pos + 1] & 0xff);
    ctx.pos += 2;
    return v;
  }
  if (infoBits === 26) {
    const b = ctx.bytes;
    const v = (((b[ctx.pos] & 0xff) << 24) | ((b[ctx.pos + 1] & 0xff) << 16) |
               ((b[ctx.pos + 2] & 0xff) << 8) | (b[ctx.pos + 3] & 0xff)) >>> 0;
    ctx.pos += 4;
    return v;
  }
  if (infoBits === 27) {
    let v = BigInt(0);
    for (let i = 0; i < 8; i++) v = (v << BigInt(8)) | BigInt(ctx.bytes[ctx.pos++] & 0xff);
    return Number(v);
  }
  throw new Error('طول CBOR غير مدعوم (indefinite-length غير مدعومة)');
}
