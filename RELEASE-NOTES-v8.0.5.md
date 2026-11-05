# LearnBridge v8.0.5

## Standard chemistry notation

- Chemical equations now render with native MathML subscripts and superscripts.
- Raw forms such as `2H_2 + O_2 → 2H_2O` and plain forms such as `2H2 + O2 -> 2H2O` display as a standard textbook equation: 2H₂ + O₂ → 2H₂O.
- Stoichiometric coefficients remain on the baseline.
- Ionic charges, reversible arrows, hydrates and state symbols are preserved.
- Existing saved lesson text is corrected while it is displayed; chemical notes do not have to be regenerated solely to hide raw underscores.
- New AI lesson generation is explicitly instructed to verify formulas, balancing, coefficients, charges and states.

## Subject-accurate textbook diagrams

- The lesson section is now titled **Textbook diagrams**.
- Version 4 adds detailed whole-specimen templates for a flowering plant, goat, bird and fish.
- Biological labels use named anatomical anchors. Straight leader lines terminate directly on the structure being named.
- Real Nigeria, Africa and West Africa boundary maps remain available.
- Diagram generation now explicitly rejects decorative artwork, placeholder shapes and generic flowcharts used as substitutes for real subject content.
- Mathematics, apparatus, circuits, ray diagrams, graphs, cross-sections and scientific models must follow their subject conventions.

## Local quality checks

After starting the local application, open:

- `http://localhost:8080/?math-preview=1` for mathematics and chemistry notation.
- `http://localhost:8080/?diagram-preview=1` for the built-in plant and animal specimen diagrams.

If another application uses port 8080, use the value of `WEB_PORT` from `.env` in both addresses.

## Illustration cache upgrade

The illustration data version is now 4 and the renderer version is 4. Existing version 3 lesson diagrams remain in the database but are replaced when version 4 diagrams are generated. To update selected saved lessons deliberately, use the backfill command and `--force` after checking Azure AI quota and cost.

Example:

```powershell
npm.cmd run backfill-illustrations -- `
  --profile ng-senior `
  --year 10 `
  --subject biology `
  --force `
  --max-lessons 5
```

## Verification completed

- TypeScript validation passed.
- Production web build passed.
- Curriculum catalogue validation passed.
- All automated tests passed, including chemical notation, precise callouts, real maps and biological specimen validation.
