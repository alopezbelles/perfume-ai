import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const ART_DIRECTION_PATH = "./data/art-direction.json";
const PROMPTS_PATH = "./data/prompts.json";
const OUTPUT_DIR = "./data/images";

const LIFESTYLE_REFERENCE = "./references/styles/lifestyle-reference.png";
const SURREAL_REFERENCE = "./references/styles/surreal-reference.png";

// 5:4 exacto
const SIZE = "1600x1280";

const QUALITY = "high";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sanitizeFilename(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function getBottleReference(artDirection) {
  const reference = artDirection.hero_product?.bottle_reference;

  if (!reference) {
    throw new Error("No se ha encontrado bottle_reference.");
  }

  return reference;
}

// --------------------------------------------------
// IMAGE REFERENCE
// --------------------------------------------------

function createImageDataUrl(imagePath) {
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

function getStyleReferenceInstructions(type) {
  if (type === "lifestyle") {
    return `
STYLE REFERENCE — EDITORIAL STILL LIFE

The SECOND input image is a STYLE REFERENCE for the
editorial still life.

Use it as a visual language reference, NOT as a composition
template.

The reference should guide:

- premium editorial quality
- rich and materially abundant still-life feeling
- ingredient quantity and grouping
- depth and layered composition
- realistic product scale relationships
- sophisticated lighting
- material richness
- tactile realism
- photographic sophistication
- overall campaign quality

DO NOT COPY from the reference:

- specific ingredients
- exact colors
- exact composition
- exact object placement
- exact bottle position
- exact bottle orientation
- specific perfume identity

The perfume's own art direction and olfactive notes determine
the ingredients, colors, atmosphere and final composition.

Create a NEW composition for this specific perfume while
maintaining the same visual language and campaign quality.

The result must feel like another photograph from the SAME
premium perfume campaign, not like a recreation of the
reference image.

The bottle remains the main visual protagonist.
`;
  }

  if (type === "surreal") {
    return `
STYLE REFERENCE — IMMERSIVE SURREAL

The SECOND input image is a STYLE REFERENCE for the
immersive surreal image.

Use it as a visual language reference, NOT as a composition
template.

The reference should guide:

- premium cinematic quality
- sophisticated surrealism
- bottle scale and visual importance
- suspended or floating product treatment
- quantity and controlled movement of visual elements
- spatial depth
- layered composition
- cinematic lighting
- atmospheric richness
- dynamic visual energy
- extreme photorealism

DO NOT COPY from the reference:

- specific ingredients
- exact colors
- exact composition
- exact object placement
- exact bottle position
- exact bottle orientation
- specific perfume identity

The perfume's own art direction and olfactive notes determine
the ingredients, colors, atmosphere and visual story.

Create a NEW surreal composition for this specific perfume
while maintaining the same visual language and campaign quality.

The result must feel like another image from the SAME premium
perfume campaign, not like a recreation of the reference image.

The bottle remains the main visual protagonist.
`;
  }

  return "";
}

function getImageGenerationPrompt(prompt, referenceType) {
  const styleReferenceInstructions =
    getStyleReferenceInstructions(referenceType);

  const surrealBottleTiltRule =
    referenceType === "surreal"
      ? `
SURREAL BOTTLE ORIENTATION:

- The perfume bottle must have a fixed, consistent lateral tilt.
- The TOP/CAP of the bottle must lean slightly to the LEFT.
- The BASE/BOTTOM of the bottle must lean slightly to the RIGHT.
- Maintain this exact tilt direction in every surreal image.
- Never mirror, reverse or alternate the tilt direction.
- Use a subtle 5–12 degree tilt from vertical.
- Do not interpret dynamic movement as permission to rotate the bottle in another direction.
- The tilt must remain elegant, controlled and physically believable.
- The bottle must never appear to be falling because of this tilt.
`
      : "";

  return `
${prompt}

${styleReferenceInstructions}

${surrealBottleTiltRule}

IMPORTANT PRODUCT REFERENCE:

The FIRST input image is the exact perfume bottle
that must appear in the final campaign image.

The SECOND input image is a STYLE REFERENCE.

The style reference must guide the visual language,
quality, richness, depth, lighting and photographic
treatment.

It must NOT replace, modify or determine the identity
of the perfume or its ingredients.

Use the supplied bottle image as the authoritative
visual reference for the product.

PRESERVE EXACTLY:

- bottle shape
- bottle proportions
- bottle dimensions
- cap design
- cap shape
- cap color
- label design
- label proportions
- label placement
- glass/material appearance
- overall product identity

The bottle must remain recognizable as the exact
same perfume bottle from the reference image.

Do NOT redesign the bottle.

Do NOT invent a different bottle.

Do NOT create additional perfume bottles.

Do NOT duplicate the bottle.

Do NOT distort the bottle.

Do NOT change the cap.

Do NOT change the label.

Do NOT cover the bottle.

The perfume bottle is the MAIN PROTAGONIST
of the composition.

PHYSICAL SCALE:

Bottle:
19 cm height
3.5 cm width
3.5 cm depth

Use the bottle as the physical scale reference
for the entire scene.

Every surrounding ingredient and environmental
object must have realistic physical proportions
relative to the perfume bottle.

Do not create oversized fruits,
flowers, leaves or ingredients.

Do not create giant decorative objects.

Do not make ingredients visually larger
than would be physically plausible in the scene.

ABUNDANCE:

Create richness through:

- multiple units
- natural ingredient clusters
- generous quantities
- overlapping elements
- foreground / midground / background layering
- varied physical states
- tactile material richness

Never create abundance by artificially enlarging
ingredients.

IMAGE QUALITY:

Extreme photorealism.

Premium commercial perfume photography.

Realistic materials.

Realistic glass.

Realistic reflections.

Realistic shadows.

Realistic botanical textures.

Realistic physical proportions.

Realistic depth.

Realistic atmospheric effects.

No illustration.

No cartoon.

No obvious CGI.

No generic stock photography.

No people.

No hands.

No additional products.

No additional perfume bottles.

HORIZONTAL 5:4 COMPOSITION.
`;
}

// --------------------------------------------------
// GENERATE IMAGE
// --------------------------------------------------

async function generateImage({
  prompt,
  bottleReference,
  styleReference,
  referenceType,
  outputPath,
}) {
  console.log("\n------------------------------------------");
  console.log(`Generando: ${outputPath}`);
  console.log("------------------------------------------");

  const bottleImageDataUrl = createImageDataUrl(bottleReference);

  const styleImageDataUrl = createImageDataUrl(styleReference);

  const finalPrompt = getImageGenerationPrompt(prompt, referenceType);

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

  const artDirection = loadJSON(ART_DIRECTION_PATH);

  const prompts = loadJSON(PROMPTS_PATH);

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
