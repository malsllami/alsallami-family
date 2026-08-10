// عمليات حسابية معيارية عامة بـ BigInt — أساس التحقق التشفيري لـ ECDSA وRSA
// Generic modular arithmetic on BigInt — foundation for ECDSA and RSA verification

function mod_(a, m) {
  const r = a % m;
  return r >= BigInt(0) ? r : r + m;
}

function modPow_(base, exp, mod) {
  if (mod === BigInt(1)) return BigInt(0);
  let result = BigInt(1);
  base = mod_(base, mod);
  while (exp > BigInt(0)) {
    if (exp & BigInt(1)) result = mod_(result * base, mod);
    exp >>= BigInt(1);
    base = mod_(base * base, mod);
  }
  return result;
}

// معكوس ضربي معياري عبر خوارزمية إقليدس الموسعة
function modInverse_(a, m) {
  let [oldR, r] = [mod_(a, m), m];
  let [oldS, s] = [BigInt(1), BigInt(0)];
  while (r !== BigInt(0)) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== BigInt(1)) throw new Error('لا يوجد معكوس ضربي — مدخلات غير صالحة');
  return mod_(oldS, m);
}
