/**
 * Angka acak 0..n-1 dengan peluang benar-benar sama untuk tiap angka.
 * Memakai crypto.getRandomValues + rejection sampling (tanpa "modulo bias").
 */
export function secureRandomInt(n: number): number {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`n harus bilangan bulat > 0, dapat ${n}`);
  const RANGE = 0x1_0000_0000; // 2^32
  const limit = RANGE - (RANGE % n);
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % n;
}

export type RandomInt = (n: number) => number;

export function uid(): string {
  return crypto.randomUUID().slice(0, 8);
}
