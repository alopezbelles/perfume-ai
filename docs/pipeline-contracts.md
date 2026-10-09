# Pipeline contracts

This document defines the data passed between pipeline stages and where each execution stores its outputs. The product, prompt and manifest contracts are implemented and validated with Ajv.

## Pipeline

```text
Perfume URL
  -> scrape
  -> data/perfumes/<perfume-id>/runs/<run-id>/product.json
  -> generate art direction
  -> art-direction.json in the same run
  -> generate prompts
  -> prompts.json in the same run
  -> generate two images
  -> images/editorial_still_life.png and images/immersive_surreal.png
```

Each stage consumes one well-defined input and either produces a complete, valid output or reports a stage failure. A failed stage must not be recorded as completed.

## Product input

The scraper accepts one product URL. Its output is the factual record for that perfume:

```json
{
  "schema_version": 1,
  "id": "agua-de-vetiver-yly",
  "name": "Agua de Vetiver (YLY)",
  "url": "https://perfumarte.com/products/agua-de-vetiver-yly",
  "description": "Description extracted from the product page.",
  "notes": {
    "top": ["Jengibre", "Bergamota", "Manzana"],
    "heart": ["Bayas de enebro", "Geranio", "Salvia"],
    "base": ["Cedro", "Incienso", "Vetiver"]
  },
  "gender": "male"
}
```

Contract:

- `schema_version` is an integer identifying this JSON format.
- `id` is a stable folder-safe identifier derived from the perfume name: lowercase, accents removed, non-alphanumeric runs replaced by hyphens, and leading/trailing hyphens removed.
- If two perfumes normalize to the same `id`, the pipeline must stop and request an explicit unique ID rather than overwrite another perfume's files.
- `name`, `url`, and `description` are strings; `url` is the original source URL.
- `notes.top`, `notes.heart`, and `notes.base` are arrays of strings. Empty arrays are valid when the source page has no notes for a group.
- `gender` is one of `male`, `female`, or `unknown`.
- Original note names and factual product data are not creatively rewritten.
- `bottle_reference` is intentionally excluded from the product record because it is derived from gender. The art-direction stage assigns it deterministically.

## Art-direction output

Art direction consumes the validated product record and `config/campaign-rules.json`. It produces the existing art-direction structure, retaining these top-level sections:

`campaign`, `format`, `hero_product`, `physical_scale_system`, `fragrance_data`, `olfactive_translation`, `shared_visual_identity`, `editorial_still_life`, `immersive_surreal`, `camera`, `photorealism`, `negative_constraints`, and `style_references`.

Contract:

- `fragrance_data` carries the product identity, source URL, gender, description, and original note groups from `product.json`.
- Creative choices live in the art direction; factual product fields remain unchanged.
- The system assigns `hero_product.bottle_reference` and style-reference paths deterministically. A male product uses `references/bottles/male/bottle-black-cap.png`; a female product uses `references/bottles/female/bottle-gold-cap.png`; unknown gender has no bottle reference until explicitly resolved.
- The chosen bottle image remains a required visual input to image generation. Its path is stored once in `hero_product.bottle_reference` and reused by prompt and image-generation stages rather than being independently selected in each stage.
- Shared bottle and style-reference paths are stored relative to the run directory and resolved against the project when used.
- Fixed campaign invariants come from `campaign-rules.json`; the generated art direction cannot redefine them.
- Both campaign concepts are required: `editorial_still_life` and `immersive_surreal`.
- The output must pass the output JSON Schema and the campaign invariant checks before it is written or passed downstream.
- New generations require `quantity`, `physical_presence` and `composition_role` for every selected visual note, alongside its existing `surreal_use` and other fields.
- `immersive_surreal.composition` requires an explicit `enveloping_structure`, two or three `primary_clusters`, `foreground_plan`, `midground_plan`, `background_plan`, `overlap_plan` and `negative_space_plan`. These describe concrete choices for the perfume, including ingredient proximity and connections across depth layers.
- Surreal ingredient masses approach the bottle sides and continue behind its silhouette. Contrast, lighting and focus maintain full product visibility without a wide empty halo. Ingredients may overlap one another but must not obscure any part of the bottle, cap or label.
- Organic framing may use naturally curved branches, stems or pods supported by the selected notes; artificial geometric rings and crowns remain prohibited. Particles are secondary accents.

## Prompt output

Prompt generation consumes the validated art direction and campaign rules. It produces:

```json
{
  "schema_version": 1,
  "perfume": {
    "id": "agua-de-vetiver-yly",
    "name": "Agua de Vetiver (YLY)",
    "gender": "male",
    "bottle_reference": "../../../../../references/bottles/male/bottle-black-cap.png"
  },
  "images": {
    "editorial_still_life": { "prompt": "..." },
    "immersive_surreal": { "prompt": "..." }
  }
}
```

Contract:

- Both named image entries are required.
- Each `prompt` is a non-empty string.
- Perfume identity and bottle reference must agree with the validated art direction.
- Campaign-specific image rules are incorporated into each prompt.
- `perfume.id` is copied from the validated product record.
- The bottle reference path is relative to the run directory.
- The surreal prompt includes all composition fields, movement enabled/types/intensity and each selected note's olfactive role, visual representation, quantity, physical presence, composition role, reason and `surreal_use`. Editorial-specific note treatment is not included in the surreal prompt.
- `getImageGenerationPrompt` retains this full prompt and adds the reference interpretation and fixed product constraints. The surreal reference guides local density, proximity, material continuity, overlaps and photographic layers without determining the perfume's ingredients or exact positions.

## Image-generation result

Image generation consumes the validated prompt output, the assigned bottle reference, and the appropriate style reference for each image. A successful result contains both image files:

- `images/editorial_still_life.png`
- `images/immersive_surreal.png`

The stage is complete only after each file exists and is non-empty. The two image types are tracked separately so a later resume can retry only a missing or failed image.

## Output folders and execution records

Implemented layout:

```text
data/perfumes/<perfume-id>/
  runs/<run-id>/
    product.json
    art-direction.json
    prompts.json
    images/
      editorial_still_life.png
      immersive_surreal.png
    manifest.json
```

- `<perfume-id>` is the normalized perfume name and is stable across runs for the same perfume.
- `<run-id>` identifies one execution; rerunning does not overwrite a previous run.
- All files for one run are kept together, including the scraped input and generated assets.
- `manifest.json` records the input URL, contract version, run status, per-stage status, relative output paths, timestamps, and redacted error details.
- Paths stored in JSON are relative to the run directory, not machine-specific absolute paths.
- Shared bottle and style references remain in `references/` and are referenced by relative path.

Run IDs include a UTC timestamp and random suffix. Running the scraper again
creates a new run directory and leaves earlier runs unchanged. If a generated
perfume ID already belongs to a differently named perfume, scraping stops;
provide a unique ID with `--id`.

## Compatibility and migration

Legacy artifacts in `data/product.json`, `data/art-direction.json`,
`data/prompts.json` and `data/images/` remain untouched. New runs use the
per-perfume layout above; no automatic migration or copying is performed.

The manual single-URL workflow uses this product contract and per-run layout.
The future batch command will use the same format and layout; batch input will
only be a list of URLs.

New art-direction responses are checked with `validateGeneratedArtDirectionData`,
which requires the complete spatial plan and note-presence fields. Downstream
readers use `validateArtDirectionData`, which also accepts historical artifacts
that omit these new fields. Present fields retain their full schema validation;
missing creative values are not invented and historical files are not rewritten.

To apply the complete new composition to an existing run, regenerate art direction,
then prompts, then images in that order using `--force` for completed stages:

```bash
npm run generate:art-direction -- "data/perfumes/<perfume-id>/runs/<run-id>" --force
npm run generate:prompts -- "data/perfumes/<perfume-id>/runs/<run-id>" --force
npm run generate:images -- "data/perfumes/<perfume-id>/runs/<run-id>" --force
```

These commands call the generation API for art direction and images and replace
that run's existing outputs. Already saved prompts and images do not change merely
because the code is updated. Historical art directions can be used to rebuild
prompts, but regeneration is needed to obtain the explicit new spatial decisions.

