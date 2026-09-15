const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const url = "https://perfumarte.com/products/agua-de-vetiver-yly";

function splitNotes(value) {
  return value
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

function extractNotes(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const notes = {
    top: [],
    heart: [],
    base: [],
  };

  for (const line of lines) {
    let match = line.match(/^Notas de salida:\s*(.+)$/i);

    if (match) {
      notes.top = splitNotes(match[1]);
      continue;
    }

    match = line.match(/^Notas de corazón:\s*(.+)$/i);

    if (match) {
      notes.heart = splitNotes(match[1]);
      continue;
    }

    match = line.match(/^Notas de fondo:\s*(.+)$/i);

    if (match) {
      notes.base = splitNotes(match[1]);
    }
  }

  return notes;
}

async function scrape() {
  console.log("🚀 Iniciando scraper...\n");

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Abriendo página...");

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Esperamos a que existan los contenidos de las pestañas,
    // aunque estén ocultos inicialmente.
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

    const notesText = await page.locator("#tab-notas").innerText();

    const notes = extractNotes(notesText);

    // --------------------------------
    // 4. CREAR OBJETO FINAL
    // --------------------------------

    const product = {
      name,
      url,
      description,
      notes,
    };

    // --------------------------------
    // 5. GUARDAR JSON
    // --------------------------------

    const dataDirectory = path.join(__dirname, "data");

    fs.mkdirSync(dataDirectory, {
      recursive: true,
    });

    const outputPath = path.join(dataDirectory, "product.json");

    fs.writeFileSync(
      outputPath,
      JSON.stringify(product, null, 2),
      "utf-8"
    );

    // --------------------------------
    // 6. MOSTRAR RESULTADO
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

scrape();