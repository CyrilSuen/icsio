
declare module 'node:crypto' {
  interface icsioScryptOptions {
    N: number
    r: number
    p: number
    maxmem: number
  }

  export function scrypt(
    password: string,
    salt: Uint8Array,
    keyLength: number,
    options: icsioScryptOptions,
    callback: (error: Error | null, derivedKey: Uint8Array) => void,
  ): void
}
