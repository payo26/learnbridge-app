# Deploy LearnBridge v8.0.2 to the existing Azure VM

This release preserves the existing PostgreSQL volume, user accounts, Paystack subscriptions and cached lessons. Never run `docker compose down -v` during this upgrade.

## Build and push from Windows PowerShell

Run these commands from the extracted v8.0.2 project directory:

```powershell
npm.cmd install
npm.cmd run build

docker build -t prayo25/learnbridge-web:v8.0.2 .
docker build -f .\backend\Dockerfile -t prayo25/learnbridge-api:v8.0.2 .

docker push prayo25/learnbridge-web:v8.0.2
docker push prayo25/learnbridge-api:v8.0.2
```

## Back up and deploy on the VM

SSH to the VM and run:

```bash
cd /home/azureuser/learnbridge

STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="learnbridge-before-v8.0.2-$STAMP.dump"

docker compose --env-file .env -f compose.prod.yml exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP"

test -s "$BACKUP" && echo "Database backup successful: $BACKUP" || exit 1
cp compose.prod.yml "compose.prod.yml.before-v8.0.2-$STAMP"
cp .env ".env.before-v8.0.2-$STAMP"
chmod 600 .env ".env.before-v8.0.2-$STAMP"
```

Set the exact Azure values without changing any other secrets:

```bash
sed -i 's#^AZURE_OPENAI_ENDPOINT=.*#AZURE_OPENAI_ENDPOINT=https://learnbridgeapp.openai.azure.com/openai/v1#' .env
sed -i 's#^AZURE_OPENAI_DEPLOYMENT=.*#AZURE_OPENAI_DEPLOYMENT=learnbridge-gpt-41-mini#' .env
```

Update only the two image tags in the existing production Compose file:

```bash
sed -i 's#prayo25/learnbridge-api:[^[:space:]]*#prayo25/learnbridge-api:v8.0.2#' compose.prod.yml
sed -i 's#prayo25/learnbridge-web:[^[:space:]]*#prayo25/learnbridge-web:v8.0.2#' compose.prod.yml

docker compose --env-file .env -f compose.prod.yml config --quiet
docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web
```

Verify:

```bash
docker compose --env-file .env -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

The health response must report `"version": "8.0.2"`, `"mathematicsRenderer": "native-mathml-1"`, `"database": "connected"` and `"aiConfigured": true`.

## Roll back the containers

The database does not need to be restored for an application-only rollback:

```bash
sed -i 's#prayo25/learnbridge-api:[^[:space:]]*#prayo25/learnbridge-api:v8.0.1#' compose.prod.yml
sed -i 's#prayo25/learnbridge-web:[^[:space:]]*#prayo25/learnbridge-web:v8.0.1#' compose.prod.yml
docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web
```
