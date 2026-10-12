// src/lib/vault.ts
// Kliensoldali sózott hash képzés Web Crypto API-val

/**
 * Véletlenszerű 16 bájtos hexadecimális só generálása
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * PIN hash generálása SHA-256 algoritmussal és sóval
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pin}:thingor_vault`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * PIN ellenőrzése a tárolt hash és só alapján
 */
export async function verifyPin(pin: string, salt: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}
