import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildEditorialPrompt, buildSurrealPrompt } from "./src/prompt-builders.ts";
import { hasPipelineFlag, logPipelineError, readRunManifest, requireRunDirectory, runStage } from "./src/pipeline-storage.ts";
import {
  validateArtDirectionData,
  validateCampaignRules,
  validateProductData,
  validatePromptDocument,
} from "./src/validation.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runDirectory = requireRunDirectory();
const force = hasPipelineFlag("--force");

const ART_DIRECTION_PATH = path.join(
  runDirectory,
  "art-direction.json"
);

const OUTPUT_PATH = path.join(
  runDirectory,
  "prompts.json"
);

const CAMPAIGN_RULES_PATH = path.join(
  "config",
  "campaign-rules.json"
);

function generatePrompts() {
  const campaignRules = validateCampaignRules(
    JSON.parse(fs.readFileSync(path.join(__dirname, CAMPAIGN_RULES_PATH), "utf8")) as unknown,
  );
  const artDirection = validateArtDirectionData(JSON.parse(
    fs.readFileSync(ART_DIRECTION_PATH, "utf8")
  ) as unknown);
  const product = validateProductData(JSON.parse(
    fs.readFileSync(path.join(runDirectory, "product.json"), "utf8")
  ) as unknown);
  const manifest = readRunManifest(runDirectory);

  if (
    product.id !== manifest.perfume_id ||
    product.name !== manifest.perfume_name ||
    product.url !== manifest.input_url
  ) {
    throw new Error("product.json no coincide con la identidad registrada en manifest.json.");
  }

  if (
    artDirection.fragrance_data.name !== product.name ||
    artDirection.fragrance_data.url !== product.url ||
    artDirection.fragrance_data.gender !== product.gender ||
    JSON.stringify(artDirection.fragrance_data.notes) !== JSON.stringify(product.notes)
  ) {
    throw new Error("La dirección artística contiene datos de perfume que no coinciden con product.json.");
  }

  const prompts = validatePromptDocument({
    schema_version: 1,
    perfume: {
      id: product.id,
      name: artDirection.fragrance_data.name,
      gender: artDirection.fragrance_data.gender,
      bottle_reference: artDirection.hero_product.bottle_reference,
    },
    images: {
      editorial_still_life: {
        prompt: buildEditorialPrompt(artDirection, campaignRules),
      },
      immersive_surreal: {
        prompt: buildSurrealPrompt(artDirection, campaignRules),
      },
    },
  });

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(prompts, null, 2),
    "utf8"
  );

  console.log("✨ Prompts generados correctamente.");
  console.log(`📄 Guardados en: ${OUTPUT_PATH}`);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(path.resolve(entryPath)).href) {
  void runStage(runDirectory, "prompts", "prompts.json", generatePrompts, { force }).catch((error) => {
    logPipelineError(error, { stage: "prompts", runDirectory });
    process.exit(1);
  });
}
