import { Ajv, type AnySchema, type ValidateFunction } from "ajv";
import fs from "node:fs";
import type { ArtDirection, CampaignRules, ProductData, PromptDocument, RunManifest } from "./types.ts";

const ajv = new Ajv({ allErrors: true, strict: false });

function readSchema(filename: string): AnySchema {
  const schemaUrl = new URL(`../config/${filename}`, import.meta.url);
  return JSON.parse(fs.readFileSync(schemaUrl, "utf8")) as AnySchema;
}

function compileSchema<T>(schema: AnySchema): ValidateFunction<T> {
  return ajv.compile<T>(schema);
}

function withStyleReferences(schema: AnySchema): AnySchema {
  if (typeof schema !== "object" || schema === null) {
    throw new Error("El esquema de dirección artística debe ser un objeto JSON Schema.");
  }

  const rootSchema = schema as Record<string, unknown>;
  const properties = rootSchema.properties;
  if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
    throw new Error("El esquema de dirección artística no contiene properties válidas.");
  }

  rootSchema.properties = {
    ...(properties as Record<string, unknown>),
    style_references: {
      type: "object",
      additionalProperties: false,
      properties: {
        lifestyle: {
          type: "object",
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean" },
            reference_path: { type: "string", minLength: 1 },
          },
          required: ["enabled", "reference_path"],
        },
        surreal: {
          type: "object",
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean" },
            reference_path: { type: "string", minLength: 1 },
          },
          required: ["enabled", "reference_path"],
        },
      },
      required: ["lifestyle", "surreal"],
    },
  };

  return rootSchema as AnySchema;
}

function validate<T>(validator: ValidateFunction<T>, value: unknown, label: string): T {
  if (validator(value)) return value;

  const details = (validator.errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "no es válido"}`)
    .join("; ");

  throw new Error(`${label} no es válido: ${details}`);
}

const productValidator = compileSchema<ProductData>(readSchema("product-schema.json"));
const campaignRulesValidator = compileSchema<CampaignRules>(readSchema("campaign-rules-schema.json"));
const artDirectionGenerationSchema = withStyleReferences(readSchema("art-direction-output-schema.json"));
const artDirectionGenerationValidator = compileSchema<ArtDirection>(artDirectionGenerationSchema);

// New model responses must contain the complete spatial plan and note presence.
// Historical artifacts may omit just these new fields; do not invent creative values.
const historicalArtDirectionSchema = structuredClone(artDirectionGenerationSchema) as {
  properties: {
    olfactive_translation: { properties: { selected_visual_notes: { items: { required: string[] } } } };
    immersive_surreal: { properties: { composition: { required: string[] } } };
  };
};
const historicalNotes = historicalArtDirectionSchema.properties.olfactive_translation.properties.selected_visual_notes.items;
historicalNotes.required = historicalNotes.required.filter(
  (field) => !["quantity", "physical_presence", "composition_role"].includes(field),
);
const historicalComposition = historicalArtDirectionSchema.properties.immersive_surreal.properties.composition;
historicalComposition.required = historicalComposition.required.filter(
  (field) => !["enveloping_structure", "primary_clusters", "foreground_plan", "midground_plan", "background_plan", "overlap_plan", "negative_space_plan"].includes(field),
);
const artDirectionValidator = compileSchema<ArtDirection>(historicalArtDirectionSchema);
const promptDocumentValidator = compileSchema<PromptDocument>(readSchema("prompts-schema.json"));
const runManifestValidator = compileSchema<RunManifest>(readSchema("run-manifest-schema.json"));

export function validateProductData(value: unknown): ProductData {
  return validate(productValidator, value, "data/product.json");
}

export function validateCampaignRules(value: unknown): CampaignRules {
  return validate(campaignRulesValidator, value, "config/campaign-rules.json");
}

export function validateArtDirectionData(value: unknown): ArtDirection {
  return validate(artDirectionValidator, value, "data/art-direction.json");
}

export function validateGeneratedArtDirectionData(value: unknown): ArtDirection {
  return validate(artDirectionGenerationValidator, value, "Nueva dirección artística");
}

export function validatePromptDocument(value: unknown): PromptDocument {
  return validate(promptDocumentValidator, value, "data/prompts.json");
}

export function validateRunManifest(value: unknown): RunManifest {
  return validate(runManifestValidator, value, "manifest.json");
}
