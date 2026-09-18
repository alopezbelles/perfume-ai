# Perfume AI --- Automated Perfume Art Direction & Campaign Image Generation

## Overview

Perfume AI is an automated creative pipeline that transforms perfume
product data into a consistent two-image premium campaign for each
fragrance.

The pipeline combines:

1.  Web scraping of perfume product pages.
2.  Structured fragrance-data extraction.
3.  AI-generated art direction based on the fragrance's olfactive
    profile.
4.  AI-generated image prompts derived from that art direction.
5.  Reference-controlled image generation using an exact bottle
    reference and a campaign style reference.
6.  Local output of the final campaign assets.

The architecture is designed to scale to a large perfume catalogue while
keeping each perfume visually distinctive.

> Campaign consistency should come from the visual language of the
> campaign, not from repeating the same composition.

------------------------------------------------------------------------

## 1. Campaign Structure

Every perfume generates exactly **two campaign images**.

### 1.1 Editorial Still Life

The editorial image is the primary hero image.

Characteristics:

-   Premium commercial perfume photography.
-   Extreme photorealism.
-   Bottle physically supported by a surface or environment.
-   Rich layered still life.
-   Selected olfactive ingredients represented physically.
-   Controlled visual abundance.
-   Foreground / midground / background depth.
-   Sophisticated lighting.
-   Realistic materials and physical proportions.
-   Spanish editorial typography.
-   Bottle remains the main visual protagonist.

### 1.2 Immersive Surreal

The surreal image is the companion campaign image.

Characteristics:

-   Bottle suspended or floating.
-   Bottle near the visual centre / primary compositional axis.
-   Fixed subtle bottle tilt:
    -   top/cap slightly to the left
    -   base/bottom slightly to the right
    -   approximately 5--12 degrees from vertical.
-   No typography.
-   Strong three-dimensional spatial construction.
-   Foreground / midground / background.
-   Environmental integration.
-   Dynamic elements and controlled movement.
-   Rich atmosphere.
-   Cinematic lighting.
-   Extreme photorealism.
-   Physically plausible ingredients.
-   Surrealism through suspension, movement, spatial relationships,
    atmosphere and interaction.

The surreal image should feel like another photograph from the same
perfume campaign, not a different creative direction.

------------------------------------------------------------------------

## 2. High-Level Architecture

``` text
                         PERFUME PRODUCT PAGE
                                  |
                                  v
                            scraper.js
                                  |
                                  v
                         data/product.json
                                  |
                                  v
                  +-------------------------------+
                  |   generate-art-direction.js   |
                  |                               |
                  |   GPT-5.6 Luna                |
                  |   + conceptual schema         |
                  |   + output JSON schema        |
                  +---------------+---------------+
                                  |
                                  v
                       data/art-direction.json
                                  |
                                  v
                       generate-prompts.js
                                  |
                                  v
                          data/prompts.json
                                  |
                                  v
                       generate-images.js
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
             Lifestyle reference        Surreal reference
                    |                           |
                    +-------------+-------------+
                                  |
                                  v
                         Image generation
                           GPT-image-2
                                  |
                     +------------+------------+
                     |                         |
                     v                         v
              editorial.png              surreal.png
```

------------------------------------------------------------------------

## 3. Project Responsibilities

### `scraper.js`

Responsible for obtaining the original perfume information from the
source product page.

Output:

``` text
data/product.json
```

The scraped data is the source of truth for the fragrance.

Typical data includes:

-   Product name.
-   Product URL.
-   Gender.
-   Fragrance notes.
-   Top notes.
-   Heart notes.
-   Base notes.
-   Product description.
-   Other source-page information.

The scraper should not perform creative interpretation.

### `generate-art-direction.js`

Transforms raw perfume data into structured creative direction.

It loads:

``` text
data/product.json
config/art-direction-schema.json
config/art-direction-output-schema.json
```

It sends the product data and conceptual schema to GPT-5.6 Luna and
requests structured JSON.

Output:

``` text
data/art-direction.json
```

The script also applies deterministic technical information after the AI
response. Gender is taken from the scraped product, and the bottle
reference is assigned programmatically.

Current bottle mapping:

``` text
male   -> references/bottles/male/bottle-black-cap.png
female -> references/bottles/female/bottle-gold-cap.png
```

The generated art direction is validated before being saved.

Important validations include:

-   Exactly 2 campaign images.
-   Horizontal orientation.
-   5:4 aspect ratio.
-   Valid gender.
-   Bottle dimensions:
    -   19 cm height.
    -   3.5 cm width.
    -   3.5 cm depth.
-   Editorial bottle must not float.
-   Editorial typography must be enabled.
-   Surreal bottle must float/suspend.
-   Surreal typography must be disabled.
-   Surreal movement types must belong to the allowed movement list.

### `generate-prompts.js`

Converts the structured art direction into the final image-generation
prompts.

Input:

``` text
data/art-direction.json
```

Output:

``` text
data/prompts.json
```

It produces separate prompts for:

``` text
images.editorial_still_life.prompt
images.immersive_surreal.prompt
```

The editorial and surreal concepts remain distinct.

### `generate-images.js`

Final image-generation stage.

It loads:

``` text
data/art-direction.json
data/prompts.json
```

It also loads the appropriate bottle and campaign style references.

The current image-generation model is:

``` text
GPT-image-2
```

Current generation settings:

``` text
size: 1600x1280
quality: high
output_format: png
```

------------------------------------------------------------------------

## 4. Art Direction Data Model

The conceptual art-direction schema separates factual fragrance data
from creative interpretation.

The current structure includes concepts such as:

``` text
campaign
format
hero_product
physical_scale_system
fragrance_data
olfactive_translation
shared_visual_identity
editorial_still_life
immersive_surreal
camera
photorealism
negative_constraints
```

The fixed campaign rules live in:

``` text
config/campaign-rules.json
```

This file is the single source of truth for campaign invariants shared by
art direction, prompt generation and image generation. It contains the
campaign format, product preservation rules, physical scale, editorial and
surreal constraints, camera, photorealism and negative constraints. A
perfume-specific `art-direction.json` supplies the creative decisions; it
must not redefine these fixed rules.

### `fragrance_data`

Contains factual perfume information.

Original notes must be preserved.

### `olfactive_translation`

Translates fragrance characteristics into visual concepts.

Examples:

``` text
Citrus  -> fruit, peel, droplets, fresh light
Floral  -> flowers, petals, botanical structures
Woody   -> bark, roots, timber, dry textures
Smoky   -> smoke, haze, atmospheric layers
Gourmand -> edible textures and rich materials
```

The translation should remain specific to the perfume.

### `selected_visual_notes`

Selected notes may contain:

``` text
note
olfactive_role
visual_representation
quantity
physical_presence
composition_role
reason
editorial_use
surreal_use
```

This gives the image-generation stage more precise creative information.

`generate-prompts.js` combines each perfume-specific art direction with
`config/campaign-rules.json`. The resulting prompts preserve the shared
campaign language while keeping editorial and surreal decisions separate.

------------------------------------------------------------------------

## 5. Physical Scale System

The perfume bottle establishes the physical scale of the scene.

Canonical dimensions:

``` text
Height: 19 cm
Width:   3.5 cm
Depth:   3.5 cm
```

Ingredients must remain physically plausible relative to the bottle.

Visual abundance should come from:

-   Quantity.
-   Grouping.
-   Variety.
-   Layering.
-   Proximity to camera.
-   Different physical states.
-   Depth.
-   Material richness.

Not from giant ingredients.

------------------------------------------------------------------------

## 6. Editorial Creative System

The editorial image uses a rich layered premium still-life approach.

The current direction emphasizes:

``` text
rich layered premium still life
medium element density
controlled negative space
foreground / midground / background
highest bottle priority
```

Important principles:

-   Multiple units may be used.
-   Ingredients can form natural clusters.
-   Ingredients can appear whole, cut, grouped, scattered or partially
    overlapping where appropriate.
-   Foreground, midground and background create depth.
-   Natural imperfections and tactile material details are desirable.
-   Bottle protection is mandatory.

### Variety over repetition

Abundance should not mean repeating the same object many times.

The system should prefer variety within selected ingredients.

Examples:

``` text
Citrus:
whole fruit + half fruit + slice + peel

Flower:
whole flower + petals + buds + botanical branch

Wood:
whole piece + broken section + chips
```

Only physically and conceptually appropriate representations should be
used.

The intended model is:

``` text
ABUNDANCE
=
quantity + grouping + variety + physical states + depth
```

rather than:

``` text
ABUNDANCE
=
many identical objects
```

------------------------------------------------------------------------

## 7. Surreal Creative System

The surreal image should feel like a complete physical or atmospheric
world surrounding the bottle rather than a collection of isolated
floating objects.

### Bottle

The bottle must:

-   Remain near the visual centre.
-   Remain the main focal point.
-   Be completely visible.
-   Remain recognizable.
-   Float/suspend.
-   Have the fixed lateral tilt:
    -   cap/top -\> slightly left
    -   base/bottom -\> slightly right.
-   Use approximately 5--12 degrees of tilt.
-   Never reverse or mirror this tilt.
-   Never appear to be falling because of the tilt.

### Spatial construction

Every surreal scene should use:

``` text
foreground
midground
background
```

These layers should correspond to different camera distances.

Foreground may contain:

-   Large nearby environmental elements.
-   Cropped objects.
-   Soft-focus elements.
-   Objects entering from frame edges.
-   Atmospheric material close to camera.

Midground should generally contain:

-   The perfume bottle.
-   Main olfactive ingredients.
-   Key environmental relationships.

Background should provide:

-   Atmosphere.
-   Context.
-   Lighting.
-   Depth.
-   Environmental continuity.

Large accidental empty areas should be avoided.

The environment should extend naturally toward the edges of the frame.

------------------------------------------------------------------------

## 8. Surreal Movement

Movement is selective. Not every object needs to follow a trajectory.

Trajectories are primarily useful for:

-   Liquids.
-   Smoke.
-   Vapor.
-   Mist.
-   Dust.
-   Particles.
-   Droplets.
-   Loose petals.
-   Other naturally dynamic atmospheric elements.

Solid ingredients such as flowers, branches, leaves, fruits, seeds,
spices, wood and stones should maintain natural physical behaviour.

They should not automatically form:

-   Arcs.
-   Spirals.
-   Rings.
-   Crowns.
-   Geometric structures.

unless there is an explicit visual reason.

This prevents several flowers from being artificially arranged into a
decorative arc simply because movement was requested.

------------------------------------------------------------------------

## 9. Style References

The image-generation stage uses two campaign style references:

``` text
references/styles/lifestyle-reference.png
references/styles/surreal-reference.png
```

They are **visual-language references, not templates**.

### Lifestyle reference communicates

-   Premium editorial quality.
-   Material richness.
-   Ingredient quantity and grouping.
-   Depth.
-   Product-scale language.
-   Lighting language.
-   Tactile realism.
-   Photographic sophistication.

### Surreal reference communicates

-   Premium cinematic quality.
-   Sophisticated surrealism.
-   Bottle scale and importance.
-   Floating/suspended treatment.
-   Controlled movement.
-   Spatial depth.
-   Layered composition.
-   Cinematic lighting.
-   Atmospheric richness.
-   Dynamic visual energy.
-   Extreme photorealism.

The references must not dictate:

-   Specific ingredients.
-   Exact colours.
-   Exact composition.
-   Exact object placement.
-   Exact bottle position.
-   Exact bottle orientation.
-   Specific perfume identity.

The perfume's own art direction determines the final content.

------------------------------------------------------------------------

## 10. Image Inputs

For each image-generation request, the model receives:

``` text
FIRST INPUT IMAGE
-> exact perfume bottle reference

SECOND INPUT IMAGE
-> campaign style reference
```

The bottle reference is authoritative for:

-   Bottle shape.
-   Proportions.
-   Dimensions.
-   Cap design.
-   Cap shape.
-   Cap colour.
-   Label design.
-   Label proportions.
-   Label placement.
-   Glass/material appearance.
-   Product identity.

The style reference controls campaign visual language only.

------------------------------------------------------------------------

## 11. Prompt Enhancement Layer

`generate-images.js` adds a technical prompt layer before image
generation.

This layer reinforces:

-   Exact bottle identity.
-   Bottle preservation.
-   Physical scale.
-   Realistic ingredient proportions.
-   Extreme photorealism.
-   Premium commercial photography.
-   Realistic materials.
-   Realistic glass.
-   Realistic reflections.
-   Realistic shadows.
-   Realistic botanical textures.
-   Realistic depth.
-   Realistic atmospheric effects.
-   No illustration.
-   No cartoon.
-   No obvious CGI.
-   No generic stock photography.
-   No people.
-   No hands.
-   No additional products.
-   No additional perfume bottles.

For surreal images, the layer also reinforces the deterministic bottle
orientation.

------------------------------------------------------------------------

## 12. Complete Processing Flow

For a new perfume:

### Step 1 --- Scrape

``` bash
node scraper.js "PERFUME_URL"
```

Creates/updates:

``` text
data/product.json
```

### Step 2 --- Generate art direction

``` bash
node generate-art-direction.js
```

Creates:

``` text
data/art-direction.json
```

### Step 3 --- Generate prompts

``` bash
node generate-prompts.js
```

Creates:

``` text
data/prompts.json
```

### Step 4 --- Generate campaign images

``` bash
node generate-images.js
```

Creates:

``` text
data/images/<perfume>-editorial.png
data/images/<perfume>-surreal.png
```

------------------------------------------------------------------------

## 13. Development Workflow

The pipeline is intentionally separated into stages.

When testing image generation, avoid regenerating upstream stages
unnecessarily.

If `art-direction.json` and `prompts.json` are already correct, visual
experimentation can normally be performed with:

``` bash
node generate-images.js
```

This is useful when testing:

-   Composition.
-   Lighting.
-   Style references.
-   Bottle positioning.
-   Surreal density.
-   Foreground depth.
-   Movement.
-   Ingredient integration.

------------------------------------------------------------------------

## 14. Git Workflow

Development uses feature branches for experimental work.

Example:

``` text
main
└── feature/art-direction
```

`main` should represent a known stable state.

Experimental creative changes should be developed in feature branches.

Typical workflow:

``` bash
git status
git add .
git commit -m "describe the change"
git push
```

When a feature reaches a stable state:

``` bash
git checkout main
git pull origin main
git merge feature/art-direction
git push origin main
```

A stable branch should be treated as a recovery point before major
creative changes.

------------------------------------------------------------------------

## 15. Environment

The project uses environment-based API configuration.

Expected variable:

``` text
OPENAI_API_KEY=...
```

Loaded through `dotenv`.

API credentials must never be hard-coded into source files or committed
to Git.

------------------------------------------------------------------------

## 16. Directory Structure

Expected high-level structure:

``` text
project/
|
+-- config/
|   +-- art-direction-schema.json
|   +-- art-direction-output-schema.json
|
+-- data/
|   +-- product.json
|   +-- art-direction.json
|   +-- prompts.json
|   +-- images/
|
+-- references/
|   +-- bottles/
|   |   +-- male/
|   |   |   +-- bottle-black-cap.png
|   |   +-- female/
|   |       +-- bottle-gold-cap.png
|   |
|   +-- styles/
|       +-- lifestyle-reference.png
|       +-- surreal-reference.png
|
+-- scraper.js
+-- generate-art-direction.js
+-- generate-prompts.js
+-- generate-images.js
+-- package.json
+-- .env
+-- README.md
```

`data/images/` contains generated assets and may become large as the
catalogue grows.

------------------------------------------------------------------------

## 17. Output Specifications

``` text
Campaign images per perfume: 2

Editorial:
- Still life
- Bottle supported
- Typography enabled
- Premium photorealistic photography

Surreal:
- Bottle floating/suspended
- Typography disabled
- Cinematic photorealism
- Dynamic spatial environment

Format:
- Horizontal
- 5:4

Output:
- 1600 × 1280
- PNG
- High quality
```

------------------------------------------------------------------------

## 18. AI Model Responsibilities

### GPT-5.6 Luna

Current role:

``` text
Raw perfume data
        ↓
AI art direction
        ↓
AI prompt generation
```

It is used for structured creative reasoning and prompt construction.

### GPT-image-2

Current role:

``` text
Final image generation
```

It receives:

``` text
generated prompt
+
exact bottle reference
+
campaign style reference
```

and produces the final visual asset.

------------------------------------------------------------------------

## 19. Important Architectural Principles

### Source data vs AI interpretation

The scraped perfume data is factual input.

AI may interpret it creatively, but original fragrance information
should not be silently changed.

### Deterministic technical constraints

Properties that should be controlled by code rather than generated by AI
include:

-   Bottle reference.
-   Bottle dimensions.
-   Gender mapping.
-   Image count.
-   Aspect ratio.
-   Output size.
-   Output format.
-   Technical editorial/surreal constraints.

### Creative decisions

AI is responsible for:

-   Art direction.
-   Olfactive-to-visual translation.
-   Ingredient selection.
-   Atmosphere.
-   Material language.
-   Composition.
-   Lighting concepts.
-   Movement concepts.
-   Environmental interpretation.

### Campaign consistency

Consistency should come from:

-   Lighting language.
-   Material treatment.
-   Photographic realism.
-   Product treatment.
-   Depth.
-   Richness.
-   Composition principles.
-   Style references.

It should not come from copying the same composition for every perfume.

### Physical plausibility

The bottle establishes physical scale.

Surrealism is encouraged, but physical proportions should remain
believable unless the creative direction explicitly requires otherwise.

------------------------------------------------------------------------

## 20. Common Failure Modes

### Surreal image feels empty

Check:

-   Foreground / midground / background.
-   Environmental density.
-   Proximity of elements to the bottle.
-   Large empty areas.
-   Edge-of-frame foreground elements.
-   Ingredient visual scale.

The solution is not simply to add more objects.

The target is:

``` text
more spatial presence
+
more integration
+
more depth
+
better scale
```

### Objects look like stickers

Strengthen:

-   Physical relationships.
-   Environmental context.
-   Overlapping elements.
-   Different camera distances.
-   Foreground elements.
-   Interaction between dynamic elements and environment.

### Flowers form artificial arches/rings

Do not request generic trajectories for all ingredients.

Reserve trajectories primarily for:

-   liquids,
-   smoke,
-   vapor,
-   mist,
-   particles,
-   droplets,
-   loose petals,
-   other dynamic elements.

Solid botanical elements should remain naturally arranged.

### Bottle tilts inconsistently

Use the deterministic rule:

``` text
TOP/CAP -> LEFT
BASE/BOTTOM -> RIGHT
```

with approximately:

``` text
5–12 degrees
```

Never mirror or reverse the tilt.

### Ingredients become gigantic

Reinforce:

``` text
The bottle establishes physical scale.
```

Increase visual presence through proximity, grouping and depth rather
than unrealistic dimensions.

### Style reference is copied too literally

Keep a strict separation between:

``` text
visual language
```

and:

``` text
specific content
```

The reference must not dictate perfume-specific ingredients or
composition.

------------------------------------------------------------------------

## 21. Scaling Strategy

The architecture is designed to scale from individual testing to a large
perfume catalogue.

Target workflow:

``` text
Perfume URL
    ↓
Scrape
    ↓
Validate source data
    ↓
Generate art direction
    ↓
Validate structured output
    ↓
Generate prompts
    ↓
Generate editorial image
    ↓
Generate surreal image
    ↓
Save campaign assets
```

Future extensions may include:

-   Batch processing.
-   Automatic retries.
-   Generation metadata.
-   Job queues.
-   Per-perfume status tracking.
-   Automatic image quality checks.
-   Automatic regeneration of failed assets.
-   Persistent campaign/version identifiers.
-   External asset storage.
-   Database-backed catalogue management.
-   Human approval workflow.

These are future extensions, not requirements of the current
implementation.

------------------------------------------------------------------------

## 22. Instructions for Future AI Agents

Any AI agent working on this repository should understand these
principles before modifying the code.

### Do not unnecessarily change the editorial system

The editorial visual language has already been tested and produces
strong results.

### Treat the surreal system as the more experimental layer

When modifying surreal generation, preserve:

-   Bottle identity.
-   Bottle centrality.
-   Fixed bottle tilt.
-   Photorealism.
-   Physical scale.
-   Campaign visual language.
-   Depth.
-   Environmental integration.
-   No typography.

### Do not solve every problem by adding more rules

If several rules express the same concept, consolidate them.

The prompt system should remain understandable and maintainable.

### Do not turn style references into templates

References communicate visual language, not exact composition.

### Preserve pipeline separation

Keep responsibilities distinct:

``` text
scraping
    ↓
factual product data

art direction
    ↓
creative planning

prompt generation
    ↓
image instructions

image generation
    ↓
final visual asset
```

Changing one layer should not unnecessarily duplicate responsibilities
in another.

------------------------------------------------------------------------

## 23. Project Philosophy

The project is not intended to generate generic AI perfume images.

It is intended to function as an **automated art-direction system**.

The final catalogue should make every perfume feel:

``` text
different enough to be its own campaign image
```

while simultaneously:

``` text
consistent enough to belong to the same premium campaign.
```

The system therefore balances three priorities:

``` text
PRODUCT ACCURACY
        +
FRAGRANCE-SPECIFIC ART DIRECTION
        +
CAMPAIGN-LEVEL VISUAL CONSISTENCY
```

That balance is the central architectural and creative principle of the
project.
