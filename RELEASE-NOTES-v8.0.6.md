# LearnBridge v8.0.6

## Real human anatomy plates

- Human body-system lessons now use bundled medical anatomy plates instead of AI-arranged circles, polygons or decorative body shapes.
- Ten plate categories are included: digestive, respiratory, circulatory, skeletal, nervous, urinary, endocrine, lymphatic, muscular and female reproductive systems.
- Unlabelled plates use verified anatomical anchor points. The existing collision-aware label renderer places the label boxes outside the body and draws one straight leader to the exact structure.
- Plates that already contain publication-quality labels are not given duplicate AI labels.
- Every plate displays its source, creator or agency and public-domain status below the diagram.
- Source SVG files are rasterised to local WebP assets before distribution; lessons do not execute third-party SVG content or depend on an external image host.

## Generation and caching

- Illustration data version is now `5` and the frontend renderer version is `5`.
- Existing lesson notes remain intact. An earlier illustration is replaced only when that lesson requests or backfills a version 5 diagram.
- Browser lesson cache keys were changed so an old anatomy drawing cannot hide the new medical plate.
- The health endpoint reports `version: 8.0.6`, `illustrationVersion: 5`, `illustrationRendererVersion: 5`, `anatomyPlateCount: 10` and `diagramStandard: real-medical-anatomy-plates`.

## Local quality review

After starting the app, open:

`http://localhost:8080/?diagram-preview=1`

This page displays every anatomy plate, its exact label leaders and its source attribution without using Azure OpenAI.

