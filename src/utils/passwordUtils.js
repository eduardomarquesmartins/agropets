const PBKDF2_ITERATIONS = 120000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

const encoder = new TextEncoder();

const bytesToHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const isHashedPassword = (value) =>
  typeof value === 'string' && value.startsWith('pbkdf2$');

export const hashPassword = async (password) => {
  const normalizedPassword = String(password || '');

  if (!normalizedPassword) {
    return '';
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto indisponivel para gerar hash de senha.');
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(normalizedPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    HASH_LENGTH * 8
  );

  const hash = new Uint8Array(derivedBits);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
};

export const verifyPassword = async (password, storedHash) => {
  if (!password || !storedHash || !storedHash.startsWith('pbkdf2$')) {
    return false;
  }

  const [, iterations, saltHex, hashHex] = storedHash.split('$');
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: parseInt(iterations),
      hash: 'SHA-256',
    },
    baseKey,
    HASH_LENGTH * 8
  );

  const calculatedHash = bytesToHex(new Uint8Array(derivedBits));
  return calculatedHash === hashHex;
};
