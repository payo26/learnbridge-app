# Deploy LearnBridge v8.0.5

## Build and test locally in PowerShell

From the extracted project directory:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
docker compose --env-file .\.env up -d --build --force-recreate
Invoke-RestMethod http://localhost:8080/api/health | Format-List
```

The health response should report version `8.0.5`, illustration version `4`, renderer version `4`, and chemistry renderer `native-mathml-1`.

## Build and push Docker images

```powershell
docker build -f backend/Dockerfile -t prayo25/learnbridge-api:v8.0.5 .
docker build -t prayo25/learnbridge-web:v8.0.5 .
docker push prayo25/learnbridge-api:v8.0.5
docker push prayo25/learnbridge-web:v8.0.5
```

## Deploy on the VM

Back up the production database first. Then upload the supplied `compose.prod.yml` to `/home/azureuser/learnbridge/compose.prod.yml` and run:

```bash
cd /home/azureuser/learnbridge
docker compose --env-file .env -f compose.prod.yml config --quiet
docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web
docker compose --env-file .env -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

Do not replace the VM `.env` or PostgreSQL volume during this update.

## Backfill selected diagrams

Run backfill only for lessons already saved in the production database. It can make an Azure AI request for each selected lesson.

```powershell
npm.cmd run backfill-illustrations -- `
  --base-url https://learnbridge-app.com `
  --profile ng-senior `
  --year 10 `
  --subject biology `
  --force `
  --max-lessons 5
```

The project reads `PRELOAD_TOKEN` from `.env`; do not paste the token into command history.
