# LearnBridge v8.0.7 release notes

## Diagram coverage upgrade

Version 8.0.7 adds a systematic diagram audit for every complete lesson note already saved in PostgreSQL. The audit reads each lesson title, objectives, key terms, sections and summary, then classifies it as covered, missing, optionally illustrated or not diagram-dependent.

### Verified built-in templates

The following high-frequency concepts now have deterministic textbook diagrams that do not consume Azure quota:

- latitude and longitude on a globe;
- a terrestrial food chain and direction of energy transfer;
- the water cycle;
- photosynthesis inputs and products;
- plant and animal cell structures;
- the Bohr model of atomic structure;
- a complete series circuit;
- a soil profile;
- the rock cycle;
- ten real human anatomy plates retained from v8.0.6.

All built-in diagrams pass the same element, boundary, label-count and label-spacing validator used for AI-generated diagrams. Descriptive labels are outside the drawing and use straight arrowed leaders that terminate on the named feature.

### Broader lesson detection

The coverage rules also detect diagram-dependent maps, landforms, ecological cycles, biological structures, chemical apparatus and particles, circuits, ray diagrams, graphs, geometric constructions, technical drawings, computer topologies, economic curves, agricultural tools and related topics. When no verified built-in template exists, the selective backfill requests one constrained textbook diagram from the configured AI service.

### New commands

```powershell
npm.cmd run audit-diagrams -- --base-url http://localhost:8080 --output .\diagram-audit.json
npm.cmd run backfill-illustrations -- --all --dry-run --base-url http://localhost:8080
npm.cmd run backfill-illustrations -- --all --yes --base-url http://localhost:8080
```

The audit is read-only. The backfill only updates complete saved lessons that are marked as missing a required diagram. Built-in templates do not use Azure; other missing diagrams can use one Azure request each.

## Compatibility and preservation

- Existing lesson notes, users, subscriptions, payments, school pilots and licences are preserved.
- No PostgreSQL volume reset is required.
- Paystack, password recovery, Nigerian/British curriculum paths, MathML fractions, chemical equations, real maps, specimens and anatomy plates remain available.
- Illustration schema and renderer versions are now `6`.
- Browser lesson cache namespace is updated so old copies do not hide the new diagrams.

## Verification

- 43 automated tests pass.
- Curriculum catalogue validation covers 160 subjects and 665 class-subject combinations.
- All nine new curated diagrams pass the production illustration validator.
- Production frontend build completes successfully.

