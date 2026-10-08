// Encryption utilities for sensitive data
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '00000000000000000000000000000000';

// Ensure the key is 32 bytes (256 bits) for AES-256
const getEncryptionKey = (): Buffer => {
  let key = ENCRYPTION_KEY;
  if (key.length < 32) {
    key = key.padEnd(32, '0');
  }
  return Buffer.from(key.slice(0, 32), 'hex');
};

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);

  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}

// Hash a value for comparison (one-way)
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Compare a plain text with a hash
export function compareHash(text: string, hashedText: string): boolean {
  return hash(text) === hashedText;
}
