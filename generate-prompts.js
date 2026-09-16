const fs = require("fs");
const path = require("path");

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

function buildEditorialPrompt(artDirection) {
  const { fragrance_data, hero_product, shared_visual_identity, editorial_still_life, camera, photorealism, negative_constraints } = artDirection;

  return `
Create a premium editorial perfume campaign photograph for "${fragrance_data.name}".

MAIN PRODUCT:
Use the exact perfume bottle from the reference image:
${hero_product.bottle_reference}

Preserve the exact bottle design, shape, proportions, cap, label, material and appearance.
The perfume bottle is the main protagonist, medium-dominant in the composition, fully visible and never covered.

SCENE:
${editorial_still_life.concept}

ENVIRONMENT:
${editorial_still_life.environment.description}

VISUAL ELEMENTS:
${editorial_still_life.visual_elements.join(", ")}

VISUAL IDENTITY:
${shared_visual_identity.concept}

MOOD:
${shared_visual_identity.mood.join(", ")}

PALETTE:
${editorial_still_life.palette.join(", ")}

MATERIALS:
${editorial_still_life.materials.join(", ")}

LIGHTING:
${editorial_still_life.lighting.direction}.
Contrast: ${editorial_still_life.lighting.contrast}.

COMPOSITION:
Balanced premium still life, low element density, generous negative space, clear foreground, midground and background depth. The perfume bottle has the highest visual priority.

TYPOGRAPHY:
Include elegant Spanish editorial typography in the negative space, never overlapping the bottle.
Use the following information:
"${editorial_still_life.typography.elements.join(" | ")}"

CAMERA:
50mm lens, medium shallow depth of field, focus on the perfume bottle, horizontal composition, 5:4 aspect ratio.

PHOTOREALISM:
Extreme photorealism. Realistic materials, lighting, shadows, reflections, botanical textures and physical proportions.

IMPORTANT:
All surrounding elements must remain physically proportional to the 19 cm tall perfume bottle.

DO NOT INCLUDE:
${negative_constraints.join(", ")}.
`.trim();
}

function buildSurrealPrompt(artDirection) {
  const { fragrance_data, hero_product, shared_visual_identity, immersive_surreal, camera, photorealism, negative_constraints } = artDirection;

  return `
Create a premium cinematic surreal perfume campaign photograph for "${fragrance_data.name}".

MAIN PRODUCT:
Use the exact perfume bottle from the reference image:
${hero_product.bottle_reference}

Preserve the exact bottle design, shape, proportions, cap, label, material and appearance.
The perfume bottle is the main protagonist, medium-dominant, fully visible and never covered.

SCENE:
${immersive_surreal.concept}

ENVIRONMENT:
${immersive_surreal.environment.description}

VISUAL ELEMENTS:
${immersive_surreal.visual_elements.join(", ")}

VISUAL IDENTITY:
${shared_visual_identity.concept}

MOOD:
${shared_visual_identity.mood.join(", ")}

PALETTE:
${immersive_surreal.palette.join(", ")}

MATERIALS:
${immersive_surreal.materials.join(", ")}

MOVEMENT:
Controlled ${immersive_surreal.movement.types.join(", ")} movement around the bottle.

COMPOSITION:
Dynamic asymmetrical composition, low to medium element density, strong depth between foreground, midground and background. The perfume bottle has the highest visual priority.

LIGHTING:
${immersive_surreal.lighting.direction}.
Contrast: ${immersive_surreal.lighting.contrast}.

CAMERA:
50mm lens, medium shallow depth of field, focus on the perfume bottle, horizontal composition, 5:4 aspect ratio.

PHOTOREALISM:
Extreme photorealism. Realistic materials, lighting, shadows, reflections, smoke, botanical textures and physical proportions.

IMPORTANT:
All surrounding elements must remain physically proportional to the 19 cm tall perfume bottle.
The bottle must appear physically suspended in the scene.

NO TYPOGRAPHY.

DO NOT INCLUDE:
${negative_constraints.join(", ")}.
`.trim();
}

function generatePrompts() {
  if (!fs.existsSync(ART_DIRECTION_PATH)) {
    throw new Error(`No existe: ${ART_DIRECTION_PATH}`);
  }

  const artDirection = JSON.parse(
    fs.readFileSync(ART_DIRECTION_PATH, "utf8")
  );

  const prompts = {
    perfume: {
      name: artDirection.fragrance_data.name,
      gender: artDirection.fragrance_data.gender,
      bottle_reference: artDirection.hero_product.bottle_reference,
    },
    images: {
      editorial_still_life: {
        prompt: buildEditorialPrompt(artDirection),
      },
      immersive_surreal: {
        prompt: buildSurrealPrompt(artDirection),
      },
    },
  };

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(prompts, null, 2),
    "utf8"
  );

  console.log("✨ Prompts generados correctamente.");
  console.log(`📄 Guardados en: ${OUTPUT_PATH}`);
}

generatePrompts();