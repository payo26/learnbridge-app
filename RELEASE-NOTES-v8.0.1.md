# LearnBridge v8.0.1 release notes

Release date: 21 October 2026

## Illustration overlap correction

- Internal text validation now measures the same wrapped lines that the browser renders.
- Multiword labels use collision-aware placement inside the central drawing area.
- When a label must move, a subtle leader points back to its intended feature.
- Label cards have an opaque background and border so text remains legible over artwork.
- Short mathematical symbols and vertex labels remain compact.
- English/language generation instructions now reject decorative word clouds and crowded text boxes.
- Browser lesson copies expire after ten minutes and use a new renderer cache namespace, so corrected server illustrations can replace old copies without pasted JavaScript.

## Targeted regeneration

The illustration backfill command now accepts `--topic` and `--force`. `--force` works only with a valid preload token, preventing public users from spending Azure quota.

Example for British Year 7 English Topic 1:

```powershell
npm.cmd run backfill-illustrations -- `
  --base-url https://maydoy.name.ng `
  --profile uk-junior `
  --year 7 `
  --subject english `
  --topic t1 `
  --force `
  --max-lessons 1
```

Change `t1` to the affected topic ID. The topic ID is shown beside the topic in preload output.

## Deployment images

```powershell
npm.cmd run build
docker build -f backend/Dockerfile -t prayo25/learnbridge-api:v8.0.1 .
docker build -t prayo25/learnbridge-web:v8.0.1 .
docker push prayo25/learnbridge-api:v8.0.1
docker push prayo25/learnbridge-web:v8.0.1
```
