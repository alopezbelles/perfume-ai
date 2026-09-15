require("dotenv").config();
const fs = require("fs");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------------------
// ARCHIVOS
// ----------------------------------------

const product = JSON.parse(
  fs.readFileSync("./data/product.json", "utf-8")
);

const schema = JSON.parse(
  fs.readFileSync("./config/art-direction-schema.json", "utf-8")
);

const outputSchema = JSON.parse(
  fs.readFileSync("./config/art-direction-output-schema.json", "utf-8")
);

// ----------------------------------------
// BOTELLA
// ----------------------------------------

function getBottleReference(gender) {
  if (gender === "male") {
    return "references/bottles/male/bottle-black-cap.png";
  }

  if (gender === "female") {
    return "references/bottles/female/bottle-gold-cap.png";
  }

  return null;
}

// ----------------------------------------
// VALIDACIONES
// ----------------------------------------

function validateArtDirection(data) {
  if (!data) {
    throw new Error("La dirección artística está vacía.");
  }

  if (data.campaign?.image_count !== 2) {
    throw new Error("image_count debe ser 2.");
  }

  if (data.format?.orientation !== "horizontal") {
    throw new Error("La orientación debe ser horizontal.");
  }

  if (data.format?.aspect_ratio !== "5:4") {
    throw new Error("El aspect ratio debe ser 5:4.");
  }

  if (!["male", "female", "unknown"].includes(data.fragrance_data?.gender)) {
    throw new Error("Gender inválido.");
  }

  if (data.physical_scale_system?.bottle_height_cm !== 19) {
    throw new Error("Altura de botella incorrecta.");
  }

  if (data.physical_scale_system?.bottle_width_cm !== 3.5) {
    throw new Error("Anchura de botella incorrecta.");
  }

  if (data.physical_scale_system?.bottle_depth_cm !== 3.5) {
    throw new Error("Profundidad de botella incorrecta.");
  }

  // Editorial
  if (data.editorial_still_life?.product_position?.floating !== false) {
    throw new Error("La imagen editorial no puede tener la botella flotando.");
  }

  if (data.editorial_still_life?.typography?.enabled !== true) {
    throw new Error("La imagen editorial debe tener typography activada.");
  }

  // Surreal
  if (data.immersive_surreal?.product_position?.floating !== true) {
    throw new Error("La imagen surreal debe tener la botella flotando.");
  }

  if (data.immersive_surreal?.product_position?.suspended !== true) {
    throw new Error("La imagen surreal debe tener la botella suspendida.");
  }

  if (data.immersive_surreal?.typography?.enabled !== false) {
    throw new Error("La imagen surreal no puede tener typography.");
  }

  // Movimiento
  const allowedMovementTypes = [
    "floating",
    "falling",
    "suspended",
    "swirling"
  ];

  const movementTypes =
    data.immersive_surreal?.movement?.types || [];

  const invalidMovement = movementTypes.some(
    (type) => !allowedMovementTypes.includes(type)
  );

  if (invalidMovement) {
    throw new Error("Se ha detectado un tipo de movimiento no permitido.");
  }

  return true;
}

// ----------------------------------------
// GENERACIÓN
// ----------------------------------------

async function generateArtDirection() {
  console.log("🎨 Generando dirección artística...");
  console.log(`🌸 Perfume: ${product.name}`);

  const response = await client.responses.create({
    model: "gpt-5.6-luna",

    input: [
      {
        role: "system",
        content: `
Eres un director de arte especializado en campañas premium de perfumería.

Tu trabajo es transformar los datos reales de un perfume en una dirección
artística completa para DOS imágenes de campaña:

1. editorial_still_life
2. immersive_surreal

Debes respetar estrictamente el esquema proporcionado.

REGLAS CREATIVAS:

- El perfume es siempre el protagonista absoluto.
- Las notas olfativas deben traducirse visualmente.
- NO es necesario representar todas las notas.
- Selecciona únicamente las notas visualmente más expresivas.
- No inventes ingredientes que no aparezcan en fragrance_data.notes.
- Las dos imágenes deben representar el mismo perfume.
- Ambas imágenes deben compartir historia olfativa, elementos principales,
  paleta y atmósfera emocional.
- La editorial debe ser una fotografía de producto premium, elegante,
  sofisticada y extremadamente fotorrealista.
- La surrealista debe ser más dinámica y conceptual, pero igualmente
  extremadamente fotorrealista.
- La botella debe permanecer completamente visible.
- Nunca deformes, dupliques o cubras la botella.
- Respeta siempre las proporciones físicas de la botella.
- Los ingredientes deben mantener proporciones físicas realistas.
- No utilices ingredientes gigantes.
- No introduzcas personas, manos ni productos adicionales.

REGLAS DE LA IMAGEN EDITORIAL:

- La botella está físicamente apoyada sobre una superficie.
- La botella NO flota.
- Debe existir una superficie realista.
- Debe utilizar tipografía editorial en español.
- La tipografía nunca puede cubrir la botella.
- La composición debe mantener espacio negativo generoso.
- La densidad de elementos debe ser baja.

REGLAS DE LA IMAGEN SURREAL:

- La botella debe estar suspendida/flotando.
- El movimiento debe ser controlado y elegante.
- Puede utilizar floating, falling, suspended o swirling.
- NO utilizar "splashing" salvo que exista una razón visual explícita
  relacionada con agua en los datos del perfume.
- No utilizar tipografía.
- La botella debe seguir siendo el elemento dominante.

REGLAS DE LOS DATOS:

- fragrance_data.name debe corresponder exactamente al perfume recibido.
- fragrance_data.url debe corresponder exactamente a la URL recibida.
- fragrance_data.gender debe utilizar exclusivamente:
  "male", "female" o "unknown".
- fragrance_data.notes debe conservar exactamente las notas recibidas.
- No elimines ni modifiques las notas originales.
- selected_visual_notes solo puede utilizar notas presentes en
  fragrance_data.notes.
- Puedes seleccionar una parte de las notas para representarlas visualmente.

REGLAS DE ESCALA:

La botella mide exactamente:

19 cm de alto
3.5 cm de ancho
3.5 cm de profundidad

La botella establece la escala física de toda la escena.

Todos los ingredientes deben mantener proporciones reales respecto
a la botella.

No utilices ingredientes sobredimensionados.

IMPORTANTE:

El campo bottle_reference NO debe ser inventado ni modificado.
La referencia de botella será añadida posteriormente por el sistema
según el gender detectado.

Devuelve únicamente el JSON solicitado.
No añadas explicaciones.
No utilices Markdown.
`,
      },

      {
        role: "user",
        content: `
DATOS ORIGINALES DEL PERFUME:

${JSON.stringify(product, null, 2)}

ESQUEMA CONCEPTUAL DE DIRECCIÓN ARTÍSTICA:

${JSON.stringify(schema, null, 2)}

Genera la dirección artística completa siguiendo estrictamente
el esquema de salida.
`,
      },
    ],

    text: {
      format: {
        type: "json_schema",
        name: "perfumarte_art_direction",
        strict: true,
        schema: outputSchema,
      },
    },
  });

  // ----------------------------------------
  // PARSEAR RESPUESTA
  // ----------------------------------------

  let artDirection;

  try {
    artDirection = JSON.parse(response.output_text);
  } catch (error) {
    console.error("❌ Luna no ha devuelto un JSON válido.");
    console.error(response.output_text);
    process.exit(1);
  }

  // ----------------------------------------
  // ASEGURAR DATOS TÉCNICOS
  // ----------------------------------------

  // El gender procede del scraper, no de Luna.
  artDirection.fragrance_data.gender = product.gender || "unknown";

  // La referencia de botella la decide nuestro sistema.
  artDirection.hero_product.bottle_reference =
    getBottleReference(artDirection.fragrance_data.gender);

  // ----------------------------------------
  // VALIDAR
  // ----------------------------------------

  try {
    validateArtDirection(artDirection);
  } catch (error) {
    console.error("❌ Dirección artística inválida.");
    console.error(`   ${error.message}`);
    process.exit(1);
  }

  // ----------------------------------------
  // GUARDAR
  // ----------------------------------------

  fs.writeFileSync(
    "./data/art-direction.json",
    JSON.stringify(artDirection, null, 2),
    "utf-8"
  );

  console.log("✅ Dirección artística generada correctamente.");
  console.log("📁 Guardada en: data/art-direction.json");
  console.log(
    `🧴 Botella: ${artDirection.hero_product.bottle_reference}`
  );
}

generateArtDirection().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});