import crypto from 'crypto';

export function hashPassword(pw: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(pw: string, salt: string, hash: string): boolean {
  try {
    const a = crypto.scryptSync(pw, salt, 64);
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
