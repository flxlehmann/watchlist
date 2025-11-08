const encoder = new TextEncoder();

function getSubtleCrypto(): SubtleCrypto {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto?.subtle) return globalCrypto.subtle;
  const webcrypto = (globalThis as { crypto?: { webcrypto?: Crypto } }).crypto?.webcrypto;
  if (webcrypto?.subtle) return webcrypto.subtle;
  throw new Error('SubtleCrypto is not available in this environment.');
}

async function digest(value: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const encoded = encoder.encode(value);
  const buffer = await subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i += 1) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= charA ^ charB;
  }
  return mismatch === 0;
}

export async function hashPassword(password: string): Promise<string> {
  return digest(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const value = await digest(password);
  return timingSafeEqual(value, hash);
}
