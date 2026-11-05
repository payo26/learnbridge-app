# Deploy LearnBridge v8.0.7

## 1. Prepare and test locally

In PowerShell, enter the extracted v8.0.7 project folder. Copy your working `.env` from the previous project if the new folder does not contain one.

```powershell
Set-Location "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-diagram-coverage"

if (-not (Test-Path .\.env)) {
  Copy-Item `
    "$env:USERPROFILE\Downloads\LearnBridge-v8.0.6-real-anatomy-plates\.env" `
    .\.env
}

npm.cmd install
npm.cmd test
npm.cmd run build
docker compose --env-file .\.env up -d --build
docker compose ps
Invoke-RestMethod http://localhost:8080/api/health | Format-List
```

Expected values include `version: 8.0.7`, `database: connected`, `diagramCoverageAudit: True`, `illustrationVersion: 6` and `illustrationRendererVersion: 6`.

Open these quality-check pages:

- <http://localhost:8080/?coverage-preview=1>
- <http://localhost:8080/?diagram-preview=1>
- <http://localhost:8080/?math-preview=1>

## 2. Audit the saved lesson database

The audit does not modify lesson notes:

```powershell
npm.cmd run audit-diagrams -- `
  --base-url http://localhost:8080 `
  --output .\diagram-audit.json
```

Preview the complete backfill selection without generating anything:

```powershell
npm.cmd run backfill-illustrations -- `
  --all `
  --dry-run `
  --base-url http://localhost:8080
```

Process five missing lessons first:

```powershell
npm.cmd run backfill-illustrations -- `
  --all `
  --yes `
  --max-lessons 5 `
  --base-url http://localhost:8080
```

When those results are satisfactory, resume all remaining saved lessons:

```powershell
npm.cmd run backfill-illustrations -- `
  --all `
  --yes `
  --base-url http://localhost:8080
```

The script reads `PRELOAD_TOKEN` from `.env` and resumes from `.learnbridge-illustration-v6-progress.json`. Do not publish either value. Built-in templates use no Azure request; other missing diagrams can use one request each.

## 3. Build and push images

```powershell
docker build -f backend/Dockerfile -t prayo25/learnbridge-api:v8.0.7 .
docker build -t prayo25/learnbridge-web:v8.0.7 .
docker login -u prayo25
docker push prayo25/learnbridge-api:v8.0.7
docker push prayo25/learnbridge-web:v8.0.7
```

## 4. Back up and update the Azure VM

On the VM:

```bash
cd /home/azureuser/learnbridge
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="learnbridge-before-v8.0.7-$STAMP.dump"

docker compose --env-file .env -f compose.prod.yml exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP"

test -s "$BACKUP" && echo "Database backup successful" || exit 1
ls -lh "$BACKUP"
```

Upload the supplied `compose.prod.yml` to `/home/azureuser/learnbridge`, preserve the production `.env`, then run:

```bash
cd /home/azureuser/learnbridge
chmod 600 .env
docker compose --env-file .env -f compose.prod.yml config --quiet
docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web
docker compose --env-file .env -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

Never run `docker compose down -v`; it deletes the named PostgreSQL volume.

## 5. Audit and backfill production

Run these from the v8.0.7 project folder on the Windows computer:

```powershell
npm.cmd run audit-diagrams -- `
  --base-url https://learnbridge-app.com `
  --output .\diagram-audit-production.json

npm.cmd run backfill-illustrations -- `
  --all `
  --dry-run `
  --base-url https://learnbridge-app.com
```

After reviewing the output, run the full backfill with `--all --yes`. Keep the terminal open so the checkpoint is updated after each successful lesson.

