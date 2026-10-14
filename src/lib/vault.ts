// src/lib/vault.ts
// Kliensoldali sózott hash képzés Web Crypto API-val (PBKDF2-SHA256, 100 000 iteráció)

/**
 * Véletlenszerű 16 bájtos hexadecimális só generálása
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * PIN hash generálása PBKDF2 algoritmussal (100 000 iteráció, SHA-256) és sóval.
 * Erős védelmet nyújt offline szótártámadások ellen.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(`${salt}:thingor_vault`),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * PIN ellenőrzése a tárolt hash és só alapján.
 * Támogatja a modern PBKDF2-t, valamint kompatibilitási fallbacket ad a korábbi SHA-256 formátumra.
 */
export async function verifyPin(pin: string, salt: string, storedHash: string): Promise<boolean> {
  // 1. Elsődleges ellenőrzés: PBKDF2-SHA256 (100 000 kör)
  const computedHash = await hashPin(pin, salt);
  if (computedHash === storedHash) {
    return true;
  }

  // 2. Visszafelé kompatibilis ellenőrzés korábbi egyszeri SHA-256 hash esetén
  try {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${pin}:thingor_vault`);
    const legacyBuf = await window.crypto.subtle.digest('SHA-256', data);
    const legacyHash = Array.from(new Uint8Array(legacyBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return legacyHash === storedHash;
  } catch {
    return false;
  }
}
