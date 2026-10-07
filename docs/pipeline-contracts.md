# Pipeline contracts

This document defines the data passed between the perfume campaign pipeline stages and where each execution stores its outputs. It is the working contract for the later AJV validation and batch-processing work.

## Pipeline

```text
Perfume URL
  -> scrape
  -> product.json
  -> generate art direction
  -> art-direction.json
  -> generate prompts
  -> prompts.json
  -> generate two images
  -> images/editorial_still_life.png
     images/immersive_surreal.png
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
- `bottle_reference` is intentionally excluded from this proposed product contract because it is derived from gender. The system infers gender from the product name/description and chooses the matching reference image in the art-direction stage.

## Art-direction output

Art direction consumes the validated product record and `config/campaign-rules.json`. It produces the existing art-direction structure, retaining these top-level sections:

`campaign`, `format`, `hero_product`, `physical_scale_system`, `fragrance_data`, `olfactive_translation`, `shared_visual_identity`, `editorial_still_life`, `immersive_surreal`, `camera`, `photorealism`, `negative_constraints`, and `style_references`.

Contract:

- `fragrance_data` carries the product identity, source URL, gender, description, and original note groups from `product.json`.
- Creative choices live in the art direction; factual product fields remain unchanged.
- The system assigns `hero_product.bottle_reference` and style-reference paths deterministically. A male product uses `references/bottles/male/bottle-black-cap.png`; a female product uses `references/bottles/female/bottle-gold-cap.png`; unknown gender has no bottle reference until explicitly resolved.
- The chosen bottle image remains a required visual input to image generation. Its path is stored once in `hero_product.bottle_reference` and reused by prompt and image-generation stages rather than being independently selected in each stage.
- Fixed campaign invariants come from `campaign-rules.json`; the generated art direction cannot redefine them.
- Both campaign concepts are required: `editorial_still_life` and `immersive_surreal`.
- The output must pass the output JSON Schema and the campaign invariant checks before it is written or passed downstream.

## Prompt output

Prompt generation consumes the validated art direction and campaign rules. It produces:

```json
{
  "schema_version": 1,
  "perfume": {
    "id": "agua-de-vetiver-yly",
    "name": "Agua de Vetiver (YLY)",
    "gender": "male",
    "bottle_reference": "references/bottles/male/bottle-black-cap.png"
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

## Image-generation result

Image generation consumes the validated prompt output, the assigned bottle reference, and the appropriate style reference for each image. A successful result contains both image files:

- `images/editorial_still_life.png`
- `images/immersive_surreal.png`

The stage is complete only after each file exists and is non-empty. The two image types are tracked separately so a later resume can retry only a missing or failed image.

## Output folders and execution records

Proposed layout:

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
- `manifest.json` records the input URL, contract version, stage status, output paths, timestamps, and error details safe to log.
- Paths stored in JSON are relative to the run directory, not machine-specific absolute paths.
- Shared bottle and style references remain in `references/` and are referenced by relative path.

## Compatibility and migration

The current project stores a single product in `data/product.json`, `data/art-direction.json`, and `data/prompts.json`, while campaign images are in the shared `data/images/` directory. These existing artifacts remain untouched until a migration is explicitly planned. The first implementation should either copy them into a matching perfume/run folder with a verified ID mapping, or leave them as legacy examples; it must not silently overwrite or discard them.

The future manual single-URL command and the future batch command use the same product contract and per-run output layout. Batch input is only a list of URLs; it does not introduce a separate pipeline format.

