# Deploy LearnBridge v8.0.4

Version 8.0.4 improves diagram label placement while retaining the v8.0.3 password-recovery configuration. Back up production first and never run `docker compose down -v`.

## Build and push from Windows PowerShell

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
docker build -t prayo25/learnbridge-web:v8.0.4 .
docker build -f .\backend\Dockerfile -t prayo25/learnbridge-api:v8.0.4 .
docker push prayo25/learnbridge-web:v8.0.4
docker push prayo25/learnbridge-api:v8.0.4
```

## Back up and deploy on the Azure VM

```bash
cd /home/azureuser/learnbridge
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="/home/azureuser/learnbridge/learnbridge-before-v8.0.4-$STAMP.dump"

docker compose --env-file .env -f compose.prod.yml exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP"

test -s "$BACKUP" || { echo "Database backup failed"; false; }
cp .env ".env.before-v8.0.4-$STAMP"
cp compose.prod.yml "compose.prod.yml.before-v8.0.4-$STAMP"
chmod 600 .env ".env.before-v8.0.4-$STAMP"

sed -i 's#prayo25/learnbridge-api:[^[:space:]]*#prayo25/learnbridge-api:v8.0.4#' compose.prod.yml
sed -i 's#prayo25/learnbridge-web:[^[:space:]]*#prayo25/learnbridge-web:v8.0.4#' compose.prod.yml

docker compose --env-file .env -f compose.prod.yml config --quiet
docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web caddy
docker compose --env-file .env -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

The health response must show:

- `version: 8.0.4`
- `database: connected`
- `illustrationVersion: 3`
- `illustrationRendererVersion: 3`
- `passwordRecoveryConfigured: true` when SMTP is configured

## Browser verification

Open a saved Biology, Chemistry, Physics and Geography lesson in a private browser window. The renderer-version change invalidates old browser copies automatically. Descriptive labels should be outside the object, should not overlap, and should have one straight arrow ending at the intended feature.

If a particular old illustration has a wrong target coordinate rather than merely a layout problem, selectively regenerate only that lesson with the backfill script and `--force`.
