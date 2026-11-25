// Dijalankan setelah `next build`: membuat out/sw.js berisi daftar semua file aplikasi
// supaya bisa disimpan di browser dan dipakai tanpa internet (offline).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
const SKIP = new Set(["sw.js", ".nojekyll", "404.html"]);

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const hash = createHash("sha256");
const files = [];
for (const p of walk(OUT).sort()) {
  let rel = relative(OUT, p).split(sep).join("/");
  if (SKIP.has(rel) || rel.endsWith(".txt") || rel.startsWith("_not-found")) continue;
  hash.update(rel).update(readFileSync(p));
  // Halaman: simpan dengan alamat yang dibuka pengguna ("./" dan "show/").
  if (rel === "index.html") rel = "./";
  else if (rel.endsWith("/index.html")) rel = rel.slice(0, -"index.html".length);
  files.push(rel);
}
const version = hash.digest("hex").slice(0, 12);
const tpl = readFileSync(new URL("./sw.template.js", import.meta.url), "utf8");
writeFileSync(join(OUT, "sw.js"), tpl.replace("__VERSION__", version).replace("__FILES__", JSON.stringify(files)));
const kb = Math.round(files.reduce((n, f) => n + statSync(join(OUT, f.endsWith("/") || f === "./" ? join(f, "index.html") : f)).size, 0) / 1024);
console.log(`sw.js: versi ${version}, ${files.length} file (${kb} KB) disiapkan untuk offline`);
