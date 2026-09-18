require("dotenv").config();
const fs = require("fs");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------------------
// ARCHIVOS
// ----------------------------------------

const product = JSON.parse(fs.readFileSync("./data/product.json", "utf-8"));

const schema = JSON.parse(
  fs.readFileSync("./config/art-direction-schema.json", "utf-8"),
);

const outputSchema = JSON.parse(
  fs.readFileSync("./config/art-direction-output-schema.json", "utf-8"),
);

const campaignRules = JSON.parse(
  fs.readFileSync("./config/campaign-rules.json", "utf-8"),
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

  if (data.campaign?.image_count !== campaignRules.campaign.image_count) {
    throw new Error("image_count debe ser 2.");
  }

  if (data.format?.orientation !== campaignRules.format.orientation) {
    throw new Error("La orientación debe ser horizontal.");
  }

  if (data.format?.aspect_ratio !== campaignRules.format.aspect_ratio) {
    throw new Error("El aspect ratio debe ser 5:4.");
  }

  if (!["male", "female", "unknown"].includes(data.fragrance_data?.gender)) {
    throw new Error("Gender inválido.");
  }

  if (
    data.physical_scale_system?.bottle_height_cm !==
    campaignRules.physical_scale.bottle_height_cm
  ) {
    throw new Error("Altura de botella incorrecta.");
  }

  if (
    data.physical_scale_system?.bottle_width_cm !==
    campaignRules.physical_scale.bottle_width_cm
  ) {
    throw new Error("Anchura de botella incorrecta.");
  }

  if (
    data.physical_scale_system?.bottle_depth_cm !==
    campaignRules.physical_scale.bottle_depth_cm
  ) {
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
  const allowedMovementTypes =
    campaignRules.immersive_surreal.allowed_movement_types;

  const movementTypes = data.immersive_surreal?.movement?.types || [];

  const invalidMovement = movementTypes.some(
    (type) => !allowedMovementTypes.includes(type),
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

NORMAS FIJAS DE CAMPAÑA (fuente única; debes respetarlas):

${JSON.stringify(campaignRules, null, 2)}

Tu trabajo es transformar los datos reales de un perfume en una dirección
artística completa para DOS imágenes de campaña:

1. editorial_still_life
2. immersive_surreal

Debes respetar estrictamente el esquema proporcionado.

REGLAS CREATIVAS:

- Selecciona únicamente las notas visualmente más expresivas.
- Prioriza entre 4 y 6 elementos visuales que representen claramente la identidad del perfume.
- No es necesario representar todas las notas visualmente.
- La abundancia debe conseguirse mediante la cantidad y agrupación de los elementos seleccionados, no mediante la incorporación de muchas notas diferentes.
- Cuando un elemento visual sea seleccionado, puede aparecer en varias unidades o en cantidades generosas cuando sea apropiado.
- Prefiere grupos naturales de ingredientes frente a elementos aislados.
- Utiliza agrupaciones, superposiciones y diferentes planos de profundidad para crear riqueza visual.
- Un mismo ingrediente puede aparecer entero, cortado, fragmentado, agrupado o en diferentes estados físicos cuando resulte natural.
- Los ingredientes deben mantener siempre proporciones físicas realistas respecto a la botella.
- No aumentes artificialmente el tamaño de los ingredientes para transmitir abundancia.
- La escena debe sentirse como un bodegón de alta perfumería rico, elaborado, táctil y materialmente abundante.
- Mantén una jerarquía clara: la botella es el protagonista y los ingredientes actúan como protagonistas secundarios.
- Para cada nota incluida en selected_visual_notes, especifica también:
  - quantity: cantidad recomendada del ingrediente.
  - physical_presence: importancia visual del ingrediente.
  - composition_role: función del ingrediente dentro de la composición.
- Utiliza valores de quantity como "subtle", "moderate", "several" o "abundant".
- No todos los ingredientes deben tener la misma cantidad ni la misma importancia visual.
- Los ingredientes más relevantes para la identidad del perfume pueden tener una presencia mayor y formar agrupaciones principales.
- Los ingredientes secundarios deben utilizarse como elementos de apoyo y detalle.

REGLAS DE REFERENCIAS VISUALES:

- Las referencias visuales de campaña establecen el lenguaje visual, el nivel de calidad y la riqueza compositiva deseada.
- Las referencias NO deben utilizarse como plantillas compositivas.
- Cada perfume debe desarrollar una composición propia basada en su identidad olfativa y en sus selected_visual_notes.
- La posición de la botella, su orientación, la distribución de los ingredientes, el ambiente, la superficie, la iluminación y la profundidad pueden variar entre perfumes.

- La variedad compositiva es deseable.
- La coherencia entre perfumes debe proceder del lenguaje visual común de la campaña, no de repetir la misma composición.
- La referencia lifestyle corresponde únicamente a editorial_still_life.
- La referencia surreal corresponde únicamente a immersive_surreal.
- Las referencias no deben determinar qué ingredientes aparecen. Los ingredientes deben proceder exclusivamente de fragrance_data y selected_visual_notes.
- No copies literalmente los ingredientes, colores, composición exacta ni identidad visual específica de las referencias.


REGLAS DE LA IMAGEN EDITORIAL:

- La botella está físicamente apoyada sobre una superficie.
- La botella debe aparecer en una posición completamente vertical y estable. Nunca debe aparecer inclinada. 
- La botella NO flota.
- Debe existir una superficie realista.
- La composición debe mantener espacio negativo generoso.
- La densidad de tipos de elementos debe ser moderada, pero la escena debe sentirse rica y materialmente abundante.
- La abundancia debe conseguirse mediante cantidad, agrupación, superposición, capas y riqueza de texturas, no mediante ingredientes gigantes.
- Utiliza cantidades generosas de los elementos visuales seleccionados cuando sea apropiado.
- Prefiere grupos naturales de ingredientes frente a objetos aislados.
- Los ingredientes pueden aparecer en diferentes estados físicos cuando sea apropiado: enteros, cortados, agrupados, parcialmente superpuestos, extendidos o fragmentados.
- Crea una composición con planos de primer plano, plano medio y fondo.
- La abundancia debe concentrarse principalmente alrededor de la zona del bodegón, manteniendo espacio suficiente para la botella y la tipografía.
- La escena debe transmitir sensación de bodegón real, elaborado, táctil y abundante.
- Mantén siempre proporciones físicas realistas respecto a la botella.
- No confundas abundancia con tamaño: aumenta la cantidad y agrupación de los ingredientes, no su escala física.



REGLAS DE LA IMAGEN SURREAL:

- La botella debe estar suspendida o flotando y situarse cerca del centro visual de la imagen, sobre el eje compositivo principal.
- Evita colocar la botella cerca de los extremos izquierdo o derecho.
- La botella debe ser siempre el elemento dominante, completamente visible, reconocible y claramente separado de los demás elementos.
- La botella debe presentar una ligera inclinación lateral fija en una única dirección: el tapón y la parte superior deben quedar ligeramente desplazados hacia la izquierda, mientras que la base o parte inferior queda ligeramente desplazada hacia la derecha.
- Esta dirección de inclinación es obligatoria y debe mantenerse en todas las imágenes surrealistas. Nunca invertir, espejar ni alternar la dirección.
- Utiliza una inclinación sutil de aproximadamente 5–12 grados respecto a la vertical.
- La inclinación debe ser elegante, controlada y físicamente creíble. Nunca debe parecer que la botella está cayendo o perdiendo estabilidad.
- Evita una presentación completamente vertical y estática propia de una fotografía de catálogo.

- La escena debe sentirse tridimensional, inmersiva y espacialmente construida, no como una colección de objetos flotando alrededor de la botella.
- Construye obligatoriamente una estructura clara de primer plano, plano medio y fondo.
- Utiliza diferentes distancias respecto a la cámara para crear profundidad fotográfica real.
- El plano medio debe concentrar los principales ingredientes y elementos visuales alrededor de la botella.
- Algunos elementos del primer plano pueden estar muy cerca de la cámara, aparecer parcialmente desenfocados, ocupar una parte importante del encuadre o quedar parcialmente recortados por los bordes.
- El fondo debe aportar contexto, atmósfera y profundidad sin convertirse en un espacio vacío.
- Evita grandes áreas de espacio vacío alrededor de la botella salvo que sean una decisión compositiva intencionada.
- El entorno debe extenderse naturalmente hacia los bordes de la imagen para crear una sensación de escena completa e inmersiva.

- Los ingredientes y elementos ambientales deben tener una presencia visual suficiente para contribuir claramente a la composición.
- Evita que los ingredientes sean excesivamente pequeños o visualmente insignificantes respecto a la botella.
- Utiliza una escala visualmente potente pero físicamente realista.
- La presencia de los elementos puede aumentar mediante proximidad a la cámara, agrupación, superposición y profundidad, nunca mediante tamaños físicamente irreales.
- Prioriza la variedad, agrupación y riqueza material antes que la repetición excesiva del mismo elemento.
- Evita distribuir los elementos de forma demasiado dispersa o aislada.

- Integra físicamente los elementos con el entorno y con la botella.
- Utiliza superposiciones controladas y relaciones espaciales claras.
- Algunos elementos pueden situarse detrás de la botella, junto a ella o atravesar visualmente el espacio cercano a ella.
- Algunos elementos pueden quedar parcialmente ocultos por otros elementos o por la profundidad de campo.
- Las superposiciones nunca deben ocultar el tapón, la etiqueta ni partes importantes de la botella.
- Evita que los ingredientes parezcan stickers u objetos independientes colocados artificialmente en el aire.
- La composición debe sentirse como un único entorno físico coherente.

- Utiliza movimiento únicamente cuando sea apropiado para el elemento representado.
- Las trayectorias, curvas, arcos, espirales o flujos deben utilizarse principalmente con elementos dinámicos o fluidos como líquidos, humo, vapor, niebla, polvo, partículas, gotas, pétalos sueltos u otros elementos capaces de transmitir movimiento.
- Los ingredientes sólidos como flores, ramas, hojas, frutas, semillas, especias, madera o piedras deben mantener un comportamiento natural y físicamente plausible.
- No organizar ingredientes sólidos artificialmente formando arcos, espirales, coronas, anillos o estructuras geométricas alrededor de la botella salvo que exista una razón visual explícita.
- No fuerces todos los elementos a seguir una misma trayectoria.
- El movimiento debe aportar dirección y energía a la escena sin convertirla en una composición caótica.
- Puede utilizar floating, suspended o swirling.
- Puede utilizar falling únicamente cuando tenga sentido físico y visual para el concepto del perfume.

- La botella debe formar parte del acontecimiento visual de la escena.
- La escena debe parecer construida alrededor de una acción, corriente, fuerza, atmósfera o fenómeno visual relacionado con la identidad olfativa del perfume.
- El movimiento y la atmósfera deben interactuar con el espacio alrededor de la botella en lugar de aparecer como efectos independientes.
- Cuando sea apropiado, utiliza superficies, rocas, vegetación, agua, humo, partículas, niebla u otros elementos ambientales para construir un espacio físico o atmosférico coherente.
- No es necesario utilizar una superficie en todas las imágenes surrealistas.
- No conviertas todas las imágenes surrealistas en paisajes.
- El entorno debe depender de la identidad olfativa y del concepto específico del perfume.

- El surrealismo debe proceder principalmente de la suspensión, el movimiento, la profundidad, la interacción entre elementos, la atmósfera y la construcción espacial de la escena.
- Prioriza las relaciones espaciales y la inmersión antes que aumentar innecesariamente la cantidad de objetos.
- No confundas complejidad con acumulación.
- Evita tanto una escena excesivamente vacía como una escena saturada y caótica.
- Los ingredientes deben mantener siempre proporciones físicas realistas respecto a la botella.
- No utilices ingredientes gigantes para aumentar el impacto visual.

- No utilizar tipografía.
- La botella debe seguir siendo el principal punto focal de toda la composición.

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
  artDirection.hero_product.bottle_reference = getBottleReference(
    artDirection.fragrance_data.gender,
  );

  // Las referencias de estilo son fijas para toda la campaña.
  artDirection.style_references = {
    lifestyle: {
      enabled: true,
      reference_path: "references/styles/lifestyle-reference.png",
    },
    surreal: {
      enabled: true,
      reference_path: "references/styles/surreal-reference.png",
    },
  };

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
    "utf-8",
  );

  console.log("✅ Dirección artística generada correctamente.");
  console.log("📁 Guardada en: data/art-direction.json");
  console.log(`🧴 Botella: ${artDirection.hero_product.bottle_reference}`);
}

generateArtDirection().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
