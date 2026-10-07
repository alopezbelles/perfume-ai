import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { sanitizeFilename } from "./src/filename.ts";
import { getImageGenerationPrompt } from "./src/image-prompt.ts";
import type { ArtDirection, CampaignRules, ImageReferenceType, PromptDocument } from "./src/types.ts";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const ART_DIRECTION_PATH = "./data/art-direction.json";
const PROMPTS_PATH = "./data/prompts.json";
const CAMPAIGN_RULES_PATH = "./config/campaign-rules.json";
const OUTPUT_DIR = "./data/images";

const LIFESTYLE_REFERENCE = "./references/styles/lifestyle-reference.png";
const SURREAL_REFERENCE = "./references/styles/surreal-reference.png";

// 5:4 exacto
const campaignRules = loadJSON<CampaignRules>(CAMPAIGN_RULES_PATH);

const SIZE = campaignRules.format.size;

const QUALITY = "high";
type ImageRequest = { prompt: string; bottleReference: string; styleReference: string; referenceType: ImageReferenceType; outputPath: string };

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function ensureDirectory(directory: string): void {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function loadJSON<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function getBottleReference(artDirection: ArtDirection): string {
  const reference = artDirection.hero_product?.bottle_reference;

  if (!reference) {
    throw new Error("No se ha encontrado bottle_reference.");
  }

  return reference;
}

// --------------------------------------------------
// IMAGE REFERENCE
// --------------------------------------------------

function createImageDataUrl(imagePath: string): string {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`No existe la imagen de referencia: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  const extension = path.extname(imagePath).toLowerCase();

  let mimeType = "image/png";

  if (extension === ".jpg" || extension === ".jpeg") {
    mimeType = "image/jpeg";
  } else if (extension === ".webp") {
    mimeType = "image/webp";
  }

  return `data:${mimeType};base64,${base64Image}`;
}

// --------------------------------------------------
// PROMPT ENHANCEMENT
// --------------------------------------------------

// GENERATE IMAGE
// --------------------------------------------------

async function generateImage({
  prompt,
  bottleReference,
  styleReference,
  referenceType,
  outputPath,
}: ImageRequest) {
  console.log("\n------------------------------------------");
  console.log(`Generando: ${outputPath}`);
  console.log("------------------------------------------");

  const bottleImageDataUrl = createImageDataUrl(bottleReference);

  const styleImageDataUrl = createImageDataUrl(styleReference);

  const finalPrompt = getImageGenerationPrompt(prompt, referenceType, campaignRules);

  const response = await client.responses.create({
    model: "gpt-5.6-luna",

    input: [
      {
        role: "user",

        content: [
          {
            type: "input_text",
            text: finalPrompt,
          },

          {
            type: "input_image",
            image_url: bottleImageDataUrl,
            detail: "high",
          },
          {
            type: "input_image",
            image_url: styleImageDataUrl,
            detail: "high",
          },
        ],
      },
    ],

    tools: [
      {
        type: "image_generation",

        model: "gpt-image-2",

        action: "generate",

        size: SIZE,

        quality: QUALITY,

        output_format: "png",
      },
    ],

    tool_choice: {
      type: "image_generation",
    },
  });

  // --------------------------------------------------
  // FIND IMAGE RESULT
  // --------------------------------------------------

  const imageGenerationCall = response.output.find(
    (item) => item.type === "image_generation_call",
  );

  if (!imageGenerationCall) {
    console.log("\nRespuesta de OpenAI:");
    console.dir(response.output, { depth: null });

    throw new Error("OpenAI no ha devuelto ninguna imagen.");
  }

  if (!imageGenerationCall.result) {
    throw new Error("La generación existe pero no contiene datos de imagen.");
  }

  // --------------------------------------------------
  // SAVE IMAGE
  // --------------------------------------------------

  const imageBuffer = Buffer.from(imageGenerationCall.result, "base64");

  fs.writeFileSync(outputPath, imageBuffer);

  console.log(`✓ Imagen guardada: ${outputPath}`);
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  console.log("==========================================");

  console.log("PERFUMARTE AI - IMAGE GENERATION");

  console.log("==========================================");

  ensureDirectory(OUTPUT_DIR);

  // ------------------------------------------------
  // LOAD DATA
  // ------------------------------------------------

  const artDirection = loadJSON<ArtDirection>(ART_DIRECTION_PATH);

  const prompts = loadJSON<PromptDocument>(PROMPTS_PATH);

  // ------------------------------------------------
  // PERFUME
  // ------------------------------------------------

  const perfumeName =
    prompts.perfume?.name || artDirection.fragrance_data?.name || "perfume";

  // ------------------------------------------------
  // BOTTLE
  // ------------------------------------------------

  const bottleReference =
    prompts.perfume?.bottle_reference || getBottleReference(artDirection);

  // ------------------------------------------------
  // PROMPTS
  // ------------------------------------------------

  const editorialPrompt = prompts.images?.editorial_still_life?.prompt;

  const surrealPrompt = prompts.images?.immersive_surreal?.prompt;

  if (!editorialPrompt) {
    throw new Error("No existe el prompt editorial en data/prompts.json");
  }

  if (!surrealPrompt) {
    throw new Error("No existe el prompt surreal en data/prompts.json");
  }

  // ------------------------------------------------
  // OUTPUT NAMES
  // ------------------------------------------------

  const safeName = sanitizeFilename(perfumeName);

  const editorialOutput = path.join(OUTPUT_DIR, `${safeName}-editorial.png`);

  const surrealOutput = path.join(OUTPUT_DIR, `${safeName}-surreal.png`);

  // ------------------------------------------------
  // INFO
  // ------------------------------------------------

  console.log(`\nPerfume: ${perfumeName}`);

  console.log(`Botella: ${bottleReference}`);

  console.log(`Formato: ${SIZE}`);

  // ------------------------------------------------
  // IMAGE 1
  // EDITORIAL
  // ------------------------------------------------

  console.log("\n[1/2] EDITORIAL STILL LIFE");

  await generateImage({
    prompt: editorialPrompt,
    bottleReference,
    styleReference: LIFESTYLE_REFERENCE,
    referenceType: "lifestyle",
    outputPath: editorialOutput,
  });

  // ------------------------------------------------
  // IMAGE 2
  // SURREAL
  // ------------------------------------------------

  console.log("\n[2/2] IMMERSIVE SURREAL");

  await generateImage({
    prompt: surrealPrompt,
    bottleReference,
    styleReference: SURREAL_REFERENCE,
    referenceType: "surreal",
    outputPath: surrealOutput,
  });

  // ------------------------------------------------
  // DONE
  // ------------------------------------------------

  console.log("\n==========================================");

  console.log("✓ GENERACIÓN COMPLETADA");

  console.log("==========================================");

  console.log(`Editorial: ${editorialOutput}`);

  console.log(`Surreal:   ${surrealOutput}`);
}

// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

main().catch((error) => {
  console.error("\n✗ ERROR:");

  console.error(error.message);

  if (error.status) {
    console.error(`HTTP status: ${error.status}`);
  }

  if (error.response) {
    console.error(error.response);
  }

  process.exit(1);
});
