const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// --------------------------------
// URL
// --------------------------------

const url = process.argv[2];

if (!url) {
  console.error("❌ Debes proporcionar la URL de un perfume.");
  console.error("Ejemplo:");
  console.error(
    "node scraper.js https://perfumarte.com/products/agua-de-vetiver-yly"
  );
  process.exit(1);
}

// --------------------------------
// UTILIDADES
// --------------------------------

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

// --------------------------------
// GÉNERO
// --------------------------------

function detectGender(description) {
  const text = description.toLowerCase();

  if (
    text.includes("masculino") ||
    text.includes("hombre")
  ) {
    return "male";
  }

  if (
    text.includes("femenino") ||
    text.includes("mujer")
  ) {
    return "female";
  }

  return "unknown";
}

// --------------------------------
// REFERENCIA DE BOTELLA
// --------------------------------

function getBottleReference(gender) {
  if (gender === "male") {
    return "references/bottles/male/bottle-black-cap.png";
  }

  if (gender === "female") {
    return "references/bottles/female/bottle-gold-cap.png";
  }

  return null;
}

// --------------------------------
// SCRAPER
// --------------------------------

async function scrape() {
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

    const bottle_reference = getBottleReference(gender);

    // --------------------------------
    // 6. CREAR OBJETO FINAL
    // --------------------------------

    const product = {
      name,
      url,
      description,
      notes,
      gender,
      bottle_reference,
    };

    // --------------------------------
    // 7. GUARDAR JSON
    // --------------------------------

    const dataDirectory = path.join(__dirname, "data");

    fs.mkdirSync(dataDirectory, {
      recursive: true,
    });

    const outputPath = path.join(
      dataDirectory,
      "product.json"
    );

    fs.writeFileSync(
      outputPath,
      JSON.stringify(product, null, 2),
      "utf-8"
    );

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

scrape();