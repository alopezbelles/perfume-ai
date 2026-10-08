import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { getImageGenerationPrompt } from "./src/image-prompt.ts";
import {
  hasPipelineFlag,
  relativePathFromRun,
  readRunManifest,
  requireRunDirectory,
  resolveRunReference,
  runStage,
} from "./src/pipeline-storage.ts";
import {
  validateArtDirectionData,
  validateCampaignRules,
  validateProductData,
  validatePromptDocument,
} from "./src/validation.ts";
import type { ImageReferenceType } from "./src/types.ts";

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const runDirectory = requireRunDirectory();
const force = hasPipelineFlag("--force");
const ART_DIRECTION_PATH = path.join(runDirectory, "art-direction.json");
const PROMPTS_PATH = path.join(runDirectory, "prompts.json");
const CAMPAIGN_RULES_PATH = path.join(projectRoot, "config/campaign-rules.json");
const OUTPUT_DIR = path.join(runDirectory, "images");

// 5:4 exacto
const campaignRules = validateCampaignRules(loadJSON<unknown>(CAMPAIGN_RULES_PATH));

const SIZE = campaignRules.format.size;
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  if (imageBuffer.length === 0) {
    throw new Error("La imagen generada está vacía; esta etapa no se marcará como completada.");
  }

  fs.writeFileSync(outputPath, imageBuffer);
  if (fs.statSync(outputPath).size === 0) {
    throw new Error("El archivo de imagen guardado está vacío.");
  }

  console.log(`✓ Imagen guardada: ${outputPath}`);
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  console.log("==========================================");

  console.log("PERFUMARTE AI - IMAGE GENERATION");

  console.log("==========================================");

  // ------------------------------------------------
  // LOAD DATA
  // ------------------------------------------------

  const artDirection = validateArtDirectionData(loadJSON<unknown>(ART_DIRECTION_PATH));

  const prompts = validatePromptDocument(loadJSON<unknown>(PROMPTS_PATH));

  const product = validateProductData(loadJSON<unknown>(path.join(runDirectory, "product.json")));

  // ------------------------------------------------
  // PERFUME
  // ------------------------------------------------

  const perfumeName =
    prompts.perfume?.name || artDirection.fragrance_data?.name || "perfume";

  const manifest = readRunManifest(runDirectory);
  if (
    product.id !== manifest.perfume_id ||
    product.name !== manifest.perfume_name ||
    product.url !== manifest.input_url ||
    prompts.perfume.id !== manifest.perfume_id ||
    prompts.perfume.name !== manifest.perfume_name ||
    prompts.perfume.gender !== product.gender ||
    prompts.perfume.bottle_reference !== artDirection.hero_product.bottle_reference ||
    artDirection.fragrance_data.name !== manifest.perfume_name ||
    artDirection.fragrance_data.url !== product.url ||
    artDirection.fragrance_data.gender !== product.gender ||
    JSON.stringify(artDirection.fragrance_data.notes) !== JSON.stringify(product.notes)
  ) {
    throw new Error("Los datos de perfume no coinciden con manifest.json.");
  }

  // ------------------------------------------------
  // BOTTLE
  // ------------------------------------------------

  const bottleReferencePath =
    prompts.perfume.bottle_reference || artDirection.hero_product.bottle_reference;
  if (!bottleReferencePath) {
    throw new Error("No se ha asignado una referencia de botella a este perfume.");
  }
  const bottleReference = resolveRunReference(runDirectory, bottleReferencePath);

  // ------------------------------------------------
  // PROMPTS
  // ------------------------------------------------

  const editorialPrompt = prompts.images?.editorial_still_life?.prompt;

  const surrealPrompt = prompts.images?.immersive_surreal?.prompt;

  if (!editorialPrompt) {
    throw new Error("No existe el prompt editorial en prompts.json de esta ejecución.");
  }

  if (!surrealPrompt) {
    throw new Error("No existe el prompt surreal en prompts.json de esta ejecución.");
  }

  // ------------------------------------------------
  // OUTPUT NAMES
  // ------------------------------------------------

  const editorialOutput = path.join(OUTPUT_DIR, "editorial_still_life.png");
  const surrealOutput = path.join(OUTPUT_DIR, "immersive_surreal.png");
  const styleReferences = artDirection.style_references;
  if (!styleReferences) {
    throw new Error("art-direction.json no contiene referencias de estilo.");
  }
  const editorialStyleReference = resolveRunReference(
    runDirectory,
    styleReferences.lifestyle.reference_path,
  );
  const surrealStyleReference = resolveRunReference(
    runDirectory,
    styleReferences.surreal.reference_path,
  );

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

  await runStage(
    runDirectory,
    "image_editorial",
    relativePathFromRun(runDirectory, editorialOutput),
    async () => {
      ensureDirectory(OUTPUT_DIR);
      return generateImage({
        prompt: editorialPrompt,
        bottleReference,
        styleReference: editorialStyleReference,
        referenceType: "lifestyle",
        outputPath: editorialOutput,
      });
    },
    { force },
  );

  // ------------------------------------------------
  // IMAGE 2
  // SURREAL
  // ------------------------------------------------

  console.log("\n[2/2] IMMERSIVE SURREAL");

  await runStage(
    runDirectory,
    "image_surreal",
    relativePathFromRun(runDirectory, surrealOutput),
    async () => {
      ensureDirectory(OUTPUT_DIR);
      return generateImage({
        prompt: surrealPrompt,
        bottleReference,
        styleReference: surrealStyleReference,
        referenceType: "surreal",
        outputPath: surrealOutput,
      });
    },
    { force },
  );

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
