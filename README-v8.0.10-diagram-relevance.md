# LearnBridge v8.0.10 — diagram relevance cleanup

This overlay removes known misplaced textbook diagrams from saved lessons and prevents the same contamination from being returned or generated again.

## What changed

- Treats the lesson topic as the strongest diagram-selection signal.
- Prevents an incidental paragraph mention from selecting a digestive, respiratory, microscope, plant, cell or other bundled plate.
- Removes the reported digestive-system plate from **Year 10 Biology — Cell growth and division**.
- Audits every saved lesson across both curricula for known misplaced bundled diagrams.
- Preserves correct diagrams in their proper lessons.
- Retains unknown/custom diagrams for manual review instead of deleting them automatically.
- Revalidates saved diagrams whenever a lesson is opened.
- Uses a new browser-cache key so corrected lessons replace stale locally cached copies.

## Apply over v8.0.9

Extract this overlay into the v8.0.9 project root and allow matching files to be replaced. Keep the existing `.env` file.

Run:

```powershell
npm.cmd test
npm.cmd run build

docker compose --env-file .\.env up -d --build --force-recreate api web
Start-Sleep -Seconds 40
docker compose ps
```

## Preview the database cleanup locally

This command scans all saved lessons but changes nothing:

```powershell
docker compose exec -T api node repair-diagram-contamination.mjs
```

Review every line marked `REMOVE`. Then apply the approved cleanup:

```powershell
docker compose exec -T api node repair-diagram-contamination.mjs --apply
```

Re-run the preview. It should report zero lessons with misplaced known diagrams:

```powershell
docker compose exec -T api node repair-diagram-contamination.mjs
```

## Clean the deployed database after v8.0.10 is deployed

SSH to the VM, change to `/home/azureuser/learnbridge`, and create a database backup before applying cleanup.

Preview:

```bash
docker compose --env-file .env -f compose.prod.yml exec -T api node repair-diagram-contamination.mjs
```

Apply only after reviewing the preview:

```bash
docker compose --env-file .env -f compose.prod.yml exec -T api node repair-diagram-contamination.mjs --apply
```

Verify:

```bash
docker compose --env-file .env -f compose.prod.yml exec -T api node repair-diagram-contamination.mjs
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

The health response should show version `8.0.10` and `diagramRelevanceAudit: true`.

## Browser verification

Open Year 10 Biology and check:

1. **Cell growth and division** does not show the digestive-system plate.
2. **The human digestive system** still shows the digestive-system plate.
3. Microscopy, plant-cell, photosynthesis and other bundled plates appear only in relevant topics.

The changed cache key normally makes a hard refresh unnecessary, but `Ctrl+F5` can be used once after deployment.
