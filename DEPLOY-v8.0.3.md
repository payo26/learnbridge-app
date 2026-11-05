# Deploy LearnBridge v8.0.3

Back up the production database and `.env`. Do not run `docker compose down -v`.

## Build and push from Windows PowerShell

```powershell
npm.cmd install
npm.cmd run build
docker build -t prayo25/learnbridge-web:v8.0.3 .
docker build -f .\backend\Dockerfile -t prayo25/learnbridge-api:v8.0.3 .
docker push prayo25/learnbridge-web:v8.0.3
docker push prayo25/learnbridge-api:v8.0.3
```

## SMTP settings

Obtain the exact SMTP settings from the mailbox provider. Add them to the VM's existing `/home/azureuser/learnbridge/.env` without removing the database, Azure OpenAI or Paystack values:

```env
SMTP_HOST=smtp.your-email-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=no-reply@learnbridge-app.com
SMTP_PASSWORD=replace_with_your_smtp_password_or_app_password
SMTP_FROM="LearnBridge <no-reply@learnbridge-app.com>"
SMTP_REPLY_TO=support@learnbridge-app.com
```

## Deploy on the Azure VM

```bash
cd /home/azureuser/learnbridge
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="learnbridge-before-v8.0.3-$STAMP.dump"
docker compose --env-file .env -f compose.prod.yml exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP"
test -s "$BACKUP" || exit 1
cp .env ".env.before-v8.0.3-$STAMP"
cp compose.prod.yml "compose.prod.yml.before-v8.0.3-$STAMP"
chmod 600 .env ".env.before-v8.0.3-$STAMP"

sed -i 's#prayo25/learnbridge-api:[^[:space:]]*#prayo25/learnbridge-api:v8.0.3#' compose.prod.yml
sed -i 's#prayo25/learnbridge-web:[^[:space:]]*#prayo25/learnbridge-web:v8.0.3#' compose.prod.yml

docker compose --env-file .env -f compose.prod.yml config --quiet
docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web
docker compose --env-file .env -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

The health response must show `version: 8.0.3`, `database: connected`, `aiConfigured: true` and `passwordRecoveryConfigured: true`.
