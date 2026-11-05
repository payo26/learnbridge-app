# Migrate LearnBridge v7.2 to v8.0

This guide preserves the existing Nigerian lesson cache, accounts, subscriptions, payments, pilots and school licences while adding the British pathway.

## Never delete the database volume

Do not run either of these commands:

```text
docker compose down -v
docker volume rm ...
```

The `-v` option deletes the PostgreSQL volume.

## Windows: move from the v7.2 folder to a separate v8 folder

Run the following in PowerShell. Change either path if your downloaded folder name differs.

```powershell
$OldProject = "$env:USERPROFILE\Downloads\LearnBridge-Azure-v7.2-premium-diagrams-real-maps-paystack\learnbridge-independent-v7.2"
$NewProject = "$env:USERPROFILE\Downloads\LearnBridge-Azure-v8-dual-curriculum\learnbridge-independent-v8"

Test-Path $OldProject
Test-Path $NewProject
```

Both commands must return `True`.

Copy the working configuration without displaying its secrets:

```powershell
Copy-Item "$OldProject\.env" "$NewProject\.env" -Force
Get-Item -Force "$NewProject\.env" | Select-Object FullName, Length, LastWriteTime
```

Create a PostgreSQL custom-format backup inside the old database container, then copy it to Downloads. This avoids PowerShell corrupting binary output redirection.

```powershell
Set-Location $OldProject
$OldDb = docker compose ps -q db
if (-not $OldDb) { throw "The v7.2 database container is not running." }

docker compose exec -T db pg_dump `
  -U learnbridge `
  -d learnbridge `
  -Fc `
  -f /tmp/learnbridge-v7.2.dump

docker cp "${OldDb}:/tmp/learnbridge-v7.2.dump" `
  "$env:USERPROFILE\Downloads\learnbridge-v7.2.dump"

Get-Item "$env:USERPROFILE\Downloads\learnbridge-v7.2.dump" |
  Format-List FullName, Length, LastWriteTime
```

Stop v7.2 without deleting its volume:

```powershell
Set-Location $OldProject
docker compose stop
```

Start only the fresh v8 database, copy the dump into it and restore:

```powershell
Set-Location $NewProject
docker compose up -d db
docker compose ps

$NewDb = docker compose ps -q db
if (-not $NewDb) { throw "The v8 database container is not running." }

docker cp "$env:USERPROFILE\Downloads\learnbridge-v7.2.dump" `
  "${NewDb}:/tmp/learnbridge-v7.2.dump"

docker compose exec -T db pg_restore `
  -U learnbridge `
  -d learnbridge `
  --clean `
  --if-exists `
  --no-owner `
  /tmp/learnbridge-v7.2.dump
```

Warnings about objects that did not exist in the new empty database can be harmless. Any password, connection, or corrupt-archive error is not harmless; stop and resolve it before continuing.

Build and start v8:

```powershell
Set-Location $NewProject
npm.cmd install
npm.cmd test
npm.cmd run build
docker compose up -d --build --force-recreate
docker compose ps
Invoke-RestMethod http://localhost:8080/api/health
```

Verify saved content and commercial records:

```powershell
docker compose exec -T db psql -U learnbridge -d learnbridge `
  -c "SELECT COUNT(*) AS cached_items FROM content_cache;"

docker compose exec -T db psql -U learnbridge -d learnbridge `
  -c "SELECT COUNT(*) AS users FROM users;"
```

Open <http://localhost:8080>. Confirm Nigerian notes, subscriber access and the British curriculum switch before removing or archiving the old folder. The old volume remains available because it was stopped, not deleted.

## Azure VM: upgrade in the existing production directory

If production already runs from `/home/azureuser/learnbridge`, keep that directory and its Compose project name. Back up first:

```bash
cd /home/azureuser/learnbridge
docker compose -f compose.prod.yml exec -T db \
  pg_dump -U learnbridge -d learnbridge -Fc -f /tmp/learnbridge-before-v8.dump
DB_ID=$(docker compose -f compose.prod.yml ps -q db)
docker cp "$DB_ID:/tmp/learnbridge-before-v8.dump" ./learnbridge-before-v8.dump
ls -lh learnbridge-before-v8.dump
```

Push `prayo25/learnbridge-api:v8.0.1` and `prayo25/learnbridge-web:v8.0.1` first. Then replace only the production application files, not `.env` and not the PostgreSQL volume:

- `compose.prod.yml`
- `Caddyfile` only if the domain configuration changed

Deploy:

```bash
cd /home/azureuser/learnbridge
chmod 600 .env
docker compose -f compose.prod.yml config --quiet
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml ps
curl -fsS https://maydoy.name.ng/api/health
```

The health response should report version `8.0.1`, a connected database and both Nigerian and British curricula.

## Rollback

Because v8 retains the compatible v7.2 database schema, a quick application rollback is normally just an image-tag rollback. Change the two image tags in `compose.prod.yml` back to the previously working v7.2 tags, then run:

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

Keep the pre-v8 database dump until production has been verified. A full database restore overwrites newer user/payment/content records and should be reserved for a genuine database rollback.
