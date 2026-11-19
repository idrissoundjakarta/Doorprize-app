// Render tiap .frame di styleframes.html menjadi JPG 1920×1080.
// Jalankan dari folder ini: node render.js
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
(async () => {
  const out = path.join(__dirname, "render");
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("file://" + path.join(__dirname, "styleframes.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const ids = await page.$$eval(".frame", (fs) => fs.map((f) => f.id));
  // LED dulu, supaya pratinjau mini di frame UI bisa memakai hasilnya.
  for (const id of ids.filter((i) => !i.includes("ui-"))) {
    await page.locator("#" + id).screenshot({ path: path.join(out, id + ".jpg"), type: "jpeg", quality: 88 });
  }
  await page.$$eval("img[data-mini]", (imgs) => imgs.forEach((i) => (i.src = "render/" + i.dataset.mini + ".jpg")));
  await page.waitForTimeout(500);
  for (const id of ids.filter((i) => i.includes("ui-"))) {
    await page.locator("#" + id).screenshot({ path: path.join(out, id + ".jpg"), type: "jpeg", quality: 88 });
  }
  await b.close();
  console.log(ids.length + " frame dirender ke render/");
})();
