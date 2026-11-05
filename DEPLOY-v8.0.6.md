# Deploy LearnBridge v8.0.6

## 1. Test locally

Copy your working `.env` into the v8.0.6 project folder, then run:

```powershell
docker compose --env-file .\.env up -d --build --force-recreate
docker compose --env-file .\.env ps
Invoke-RestMethod http://localhost:8080/api/health | Format-List
Start-Process "http://localhost:8080/?diagram-preview=1"
```

The health response should report version `8.0.6`, illustration version `5`, renderer version `5` and ten anatomy plates.

## 2. Build and push the production images

```powershell
docker build -f backend/Dockerfile -t prayo25/learnbridge-api:v8.0.6 .
docker build -t prayo25/learnbridge-web:v8.0.6 .
docker push prayo25/learnbridge-api:v8.0.6
docker push prayo25/learnbridge-web:v8.0.6
```

## 3. Update the VM

The supplied `compose.prod.yml` already references the v8.0.6 image tags. Upload it, SSH into the VM and create a database backup before updating.

```bash
cd /home/azureuser/learnbridge
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="learnbridge-before-v8.0.6-$STAMP.dump"
docker compose --env-file .env -f compose.prod.yml exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP"
test -s "$BACKUP" && echo "Database backup successful" || exit 1

docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web
docker compose --env-file .env -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

## 4. Backfill selected anatomy lessons

The new image does not rewrite all cached lessons automatically. Review the local anatomy preview first, then use the existing selective backfill command with `--force` for the required profile, year and subject. This controls Azure OpenAI cost and leaves unrelated saved notes unchanged.

