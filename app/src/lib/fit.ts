/** Ukuran huruf yang mengecil otomatis untuk teks panjang (unit relatif terhadap panggung). */
export function fit(text: string, maxCqmin: number, widthCqw = 80): string {
  const perChar = widthCqw / Math.max(1, text.length * 0.62);
  return `min(${maxCqmin}cqmin, ${perChar.toFixed(2)}cqw)`;
}
