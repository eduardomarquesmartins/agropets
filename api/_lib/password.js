import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const PBKDF2_ITERATIONS = 120000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

const isHex = (value) => /^[0-9a-f]+$/i.test(value);

export const isHashedPassword = (value) =>
  typeof value === 'string' && value.startsWith('pbkdf2$');

export const hashPasswordServer = (password) => {
  const normalizedPassword = String(password || '');

  if (!normalizedPassword) {
    return '';
  }

  const salt = randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(normalizedPassword, salt, PBKDF2_ITERATIONS, HASH_LENGTH, 'sha256');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${hash.toString('hex')}`;
};

export const verifyPasswordServer = (password, storedPassword) => {
  const normalizedPassword = String(password || '');
  const normalizedStoredPassword = String(storedPassword || '');

  if (!normalizedPassword || !normalizedStoredPassword) {
    return false;
  }

  if (!isHashedPassword(normalizedStoredPassword)) {
    return normalizedStoredPassword === normalizedPassword;
  }

  const [, iterationString, saltHex, hashHex] = normalizedStoredPassword.split('$');
  const iterations = Number(iterationString);

  if (!iterations || !isHex(saltHex) || !isHex(hashHex)) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expectedHash = Buffer.from(hashHex, 'hex');
  const derivedHash = pbkdf2Sync(normalizedPassword, salt, iterations, expectedHash.length, 'sha256');

  return timingSafeEqual(expectedHash, derivedHash);
};

export const needsPasswordUpgrade = (storedPassword) =>
  Boolean(storedPassword) && !isHashedPassword(storedPassword);
