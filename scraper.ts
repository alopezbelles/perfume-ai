import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { detectGender, extractNotes } from "./src/product-data.ts";
import { createRunDirectory, normalizePerfumeId, runStage } from "./src/pipeline-storage.ts";
import { validateProductData } from "./src/validation.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --------------------------------
// SCRAPER
// --------------------------------

async function scrape(url: string, explicitId?: string) {
  console.log("🚀 Iniciando scraper...\n");

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Abriendo página...");
    console.log(`🔗 ${url}\n`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("#tab-notas", {
      state: "attached",
      timeout: 60000,
    });

    await page.waitForSelector("#tab-descripcion", {
      state: "attached",
      timeout: 60000,
    });

    console.log("✅ Página cargada\n");

    // --------------------------------
    // 1. NOMBRE
    // --------------------------------

    const titleMeta = await page
      .locator("meta[property='og:title']")
      .getAttribute("content");

    if (!titleMeta) {
      throw new Error("No se ha encontrado el nombre del perfume.");
    }

    const name = titleMeta.split("|")[0].trim();

    // --------------------------------
    // 2. DESCRIPCIÓN
    // --------------------------------

    const description = (
      await page.locator("#tab-descripcion").innerText()
    ).trim();

    // --------------------------------
    // 3. NOTAS OLFATIVAS
    // --------------------------------

    const notesText = await page
      .locator("#tab-notas")
      .innerText();

    const notes = extractNotes(notesText);

    // --------------------------------
    // 4. GÉNERO
    // --------------------------------

    const gender = detectGender(description);

    // --------------------------------
    // 5. REFERENCIA BOTELLA
    // --------------------------------

    // --------------------------------
    // 6. CREAR OBJETO FINAL
    // --------------------------------

    const product = validateProductData({
      schema_version: 1,
      id: explicitId ?? normalizePerfumeId(name),
      name,
      url,
      description,
      notes,
      gender,
    });

    // --------------------------------
    // 7. GUARDAR JSON
    // --------------------------------

    const runDirectory = createRunDirectory(product, explicitId);
    const outputPath = path.join(runDirectory, "product.json");
    await runStage(runDirectory, "scrape", "product.json", () => {
      fs.writeFileSync(outputPath, JSON.stringify(product, null, 2), "utf-8");
    });

    // --------------------------------
    // 8. MOSTRAR RESULTADO
    // --------------------------------

    console.log("📦 Producto extraído:\n");
    console.log(JSON.stringify(product, null, 2));

    console.log(`\n💾 Guardado en: ${outputPath}`);
    console.log("\n✅ Scraping completado correctamente.");

  } catch (error) {
    console.error("\n❌ Error durante el scraping:");
    console.error(error);

    process.exitCode = 1;

  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const idOption = args.indexOf("--id");
  const explicitId = idOption >= 0 ? args[idOption + 1] : undefined;
  const url = args.find(
    (arg, index) => !arg.startsWith("--") && !(idOption >= 0 && index === idOption + 1),
  );

  if (!url) {
    console.error("❌ Debes proporcionar la URL de un perfume.");
    console.error("Ejemplo:");
    console.error("npm run scrape -- https://perfumarte.com/products/agua-de-vetiver-yly");
    process.exitCode = 1;
    return;
  }

  if (idOption >= 0 && (!explicitId || explicitId.startsWith("--"))) {
    console.error("❌ --id necesita un identificador único, por ejemplo: --id petalos-de-musk-arw");
    process.exitCode = 1;
    return;
  }

  await scrape(url, explicitId);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(path.resolve(entryPath)).href) {
  void main();
}
