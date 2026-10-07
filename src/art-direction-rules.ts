import type { ArtDirection, CampaignRules } from "./types.ts";

export function applyCampaignRules(data: ArtDirection, campaignRules: CampaignRules): void {
  data.campaign.image_count = campaignRules.campaign.image_count;
  data.format = {
    orientation: campaignRules.format.orientation,
    aspect_ratio: campaignRules.format.aspect_ratio,
  };

  data.physical_scale_system.bottle_height_cm = campaignRules.physical_scale.bottle_height_cm;
  data.physical_scale_system.bottle_width_cm = campaignRules.physical_scale.bottle_width_cm;
  data.physical_scale_system.bottle_depth_cm = campaignRules.physical_scale.bottle_depth_cm;
  data.physical_scale_system.scale_reference = campaignRules.physical_scale.rule;
  data.physical_scale_system.element_scale_rule = campaignRules.physical_scale.proportions;
  data.physical_scale_system.relative_scale = campaignRules.physical_scale.proportions;
  data.physical_scale_system.artistic_scale_override = campaignRules.physical_scale.abundance_must_not_use;

  data.camera = {
    lens: campaignRules.camera.lens,
    depth_of_field: campaignRules.camera.depth_of_field,
    focus: campaignRules.camera.focus,
    orientation: campaignRules.format.orientation,
    aspect_ratio: campaignRules.format.aspect_ratio,
  };
}

export function validateArtDirection(data: ArtDirection, campaignRules: CampaignRules): true {
  if (!data) throw new Error("La dirección artística está vacía.");

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
  if (data.physical_scale_system?.bottle_height_cm !== campaignRules.physical_scale.bottle_height_cm) {
    throw new Error("Altura de botella incorrecta.");
  }
  if (data.physical_scale_system?.bottle_width_cm !== campaignRules.physical_scale.bottle_width_cm) {
    throw new Error("Anchura de botella incorrecta.");
  }
  if (data.physical_scale_system?.bottle_depth_cm !== campaignRules.physical_scale.bottle_depth_cm) {
    throw new Error("Profundidad de botella incorrecta.");
  }

  if (data.editorial_still_life?.product_position?.floating !== false) {
    throw new Error("La imagen editorial no puede tener la botella flotando.");
  }
  if (data.editorial_still_life?.typography?.enabled !== true) {
    throw new Error("La imagen editorial debe tener typography activada.");
  }
  if (data.immersive_surreal?.product_position?.floating !== true) {
    throw new Error("La imagen surreal debe tener la botella flotando.");
  }
  if (data.immersive_surreal?.product_position?.suspended !== true) {
    throw new Error("La imagen surreal debe tener la botella suspendida.");
  }
  if (data.immersive_surreal?.typography?.enabled !== false) {
    throw new Error("La imagen surreal no puede tener typography.");
  }

  const allowedMovementTypes = campaignRules.immersive_surreal.allowed_movement_types;
  const movementTypes = data.immersive_surreal?.movement?.types || [];
  if (movementTypes.some((type: string) => !allowedMovementTypes.includes(type))) {
    throw new Error("Se ha detectado un tipo de movimiento no permitido.");
  }

  return true;
}
