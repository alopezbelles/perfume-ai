export type Gender = "male" | "female" | "unknown";

export interface ProductNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface ProductData {
  name: string;
  url: string;
  description: string;
  notes: ProductNotes;
  gender: Gender;
  bottle_reference: string | null;
}

export interface CampaignRules {
  campaign: {
    image_count: number;
    visual_relationship: string[];
  };
  format: {
    orientation: string;
    aspect_ratio: string;
    size: string;
  };
  hero_product: {
    role: string;
    visibility: string;
    must_not_be_covered: boolean;
    must_not_be_distorted: boolean;
    must_not_be_duplicated: boolean;
    preserve: string[];
  };
  physical_scale: {
    bottle_height_cm: number;
    bottle_width_cm: number;
    bottle_depth_cm: number;
    rule: string;
    proportions: string;
    abundance_must_not_use: string;
  };
  editorial_still_life: { rules: string[] };
  immersive_surreal: { rules: string[]; allowed_movement_types: string[] };
  camera: { lens: string; depth_of_field: string; focus: string };
  photorealism: { level: string; requirements: string[] };
  negative_constraints: string[];
}

export interface ArtDirection {
  campaign: { image_count: number };
  format: { orientation: string; aspect_ratio: string };
  hero_product: { bottle_reference: string | null };
  physical_scale_system: {
    bottle_height_cm: number;
    bottle_width_cm: number;
    bottle_depth_cm: number;
    scale_reference: string;
    element_scale_rule: string;
    relative_scale: string;
    artistic_scale_override: string;
  };
  fragrance_data: {
    name: string;
    url: string;
    gender: Gender;
    description: string;
    notes: ProductNotes;
  };
  shared_visual_identity: { concept: string; mood: string[] };
  editorial_still_life: {
    concept: string;
    product_position: { floating: boolean };
    environment: { description: string };
    visual_elements: string[];
    palette: string[];
    materials: string[];
    lighting: { direction: string; contrast: string };
    typography: { enabled: boolean; elements: string[] };
  };
  immersive_surreal: {
    concept: string;
    product_position: { floating: boolean; suspended: boolean };
    environment: { description: string };
    visual_elements: string[];
    movement: { types: string[] };
    palette: string[];
    materials: string[];
    lighting: { direction: string; contrast: string };
    typography: { enabled: boolean };
  };
  camera: {
    lens: string;
    depth_of_field: string;
    focus: string;
    orientation: string;
    aspect_ratio: string;
  };
  photorealism: { level: string; requirements: string[] };
  negative_constraints: string[];
  style_references?: {
    lifestyle: { enabled: boolean; reference_path: string };
    surreal: { enabled: boolean; reference_path: string };
  };
}

export interface PromptSourceArtDirection {
  fragrance_data: { name: string };
  hero_product: { bottle_reference: string | null };
  shared_visual_identity: { concept: string; mood: string[] };
  editorial_still_life: {
    concept: string;
    environment: { description: string };
    visual_elements: string[];
    palette: string[];
    materials: string[];
    lighting: { direction: string; contrast: string };
    typography: { elements: string[] };
  };
  immersive_surreal: {
    concept: string;
    environment: { description: string };
    visual_elements: string[];
    palette: string[];
    materials: string[];
    lighting: { direction: string; contrast: string };
  };
}

export type PromptImageType = "editorial_still_life" | "immersive_surreal";
export type ImageReferenceType = "lifestyle" | "surreal";

export interface PromptDocument {
  perfume: {
    name: string;
    gender: Gender;
    bottle_reference: string | null;
  };
  images: Record<PromptImageType, { prompt: string }>;
}

export interface JsonObject {
  [key: string]: unknown;
}
