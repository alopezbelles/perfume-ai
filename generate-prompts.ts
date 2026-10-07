import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildEditorialPrompt, buildSurrealPrompt } from "./src/prompt-builders.ts";
import { validateArtDirectionData, validateCampaignRules, validatePromptDocument } from "./src/validation.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ART_DIRECTION_PATH = path.join(
  __dirname,
  "data",
  "art-direction.json"
);

const OUTPUT_PATH = path.join(
  __dirname,
  "data",
  "prompts.json"
);

const CAMPAIGN_RULES_PATH = path.join(
  __dirname,
  "config",
  "campaign-rules.json"
);

const campaignRules = validateCampaignRules(JSON.parse(
  fs.readFileSync(CAMPAIGN_RULES_PATH, "utf8"),
) as unknown);

function generatePrompts() {
  if (!fs.existsSync(ART_DIRECTION_PATH)) {
    throw new Error(`No existe: ${ART_DIRECTION_PATH}`);
  }

  const artDirection = validateArtDirectionData(JSON.parse(
    fs.readFileSync(ART_DIRECTION_PATH, "utf8")
  ) as unknown);

  const prompts = validatePromptDocument({
    perfume: {
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
  generatePrompts();
}
