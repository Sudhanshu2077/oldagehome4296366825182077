import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function key(): Buffer {
  const seed = process.env.ADHAAR_ENCRYPTION_KEY || process.env.SESSION_SIGNING_KEY || 'igohms-dev-aadhaar-key';
  return createHash('sha256').update(seed).digest();
}

export function encryptAadhaar(value: string): { enc: string; last4: string } {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { enc: '', last4: '' };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const plain = Buffer.from(digits, 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: Buffer.concat([iv, tag, enc]).toString('base64'),
    last4: digits.slice(-4),
  };
}

export function decryptAadhaar(enc: string): string {
  if (!enc) return '';
  const raw = Buffer.from(enc, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskAadhaar(enc: string, last4: string): string {
  if (last4) return `XXXX-XXXX-${last4}`;
  if (!enc) return '';
  try {
    const digits = decryptAadhaar(enc);
    return `XXXX-XXXX-${digits.slice(-4)}`;
  } catch {
    return 'XXXX-XXXX-XXXX';
  }
}
