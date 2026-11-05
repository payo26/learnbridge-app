# Apply the LearnBridge v8.0.1 illustration fix

This patch is designed for the existing `learnbridge-independent-v8` folder. It does not contain or replace `.env`, PostgreSQL data, lesson notes, accounts or payments.

## 1. Stop only the local application containers

In PowerShell:

```powershell
Set-Location "$env:USERPROFILE\Downloads\LearnBridge-Azure-v8-dual-curriculum\learnbridge-independent-v8"
docker compose stop web api
```

Do not run `docker compose down -v`.

## 2. Extract the patch over the project

```powershell
Expand-Archive `
  -Path "$env:USERPROFILE\Downloads\LearnBridge-v8.0.1-illustration-overlap-fix.zip" `
  -DestinationPath "$env:USERPROFILE\Downloads\LearnBridge-Azure-v8-dual-curriculum\learnbridge-independent-v8" `
  -Force
```

## 3. Validate and rebuild

```powershell
Set-Location "$env:USERPROFILE\Downloads\LearnBridge-Azure-v8-dual-curriculum\learnbridge-independent-v8"
npm.cmd install
npm.cmd test
npm.cmd run build
docker compose up -d --build --force-recreate
docker compose ps
Invoke-RestMethod http://localhost:8080/api/health
```

Expected version: `8.0.1`. Expected illustration renderer version: `2`.

## 4. Regenerate only an affected illustration

The display fix improves existing diagrams automatically. If the shapes in one saved diagram are also poor, regenerate just that topic. For example, British Year 7 English Topic 1 is `t1`:

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

Use `t2`, `t3`, `t4` or `t5` if that is the affected lesson. A valid `PRELOAD_TOKEN` must remain in `.env`.

## 5. Build and push the corrected production images

```powershell
docker build -f backend/Dockerfile -t prayo25/learnbridge-api:v8.0.1 .
docker build -t prayo25/learnbridge-web:v8.0.1 .
docker login -u prayo25
docker push prayo25/learnbridge-api:v8.0.1
docker push prayo25/learnbridge-web:v8.0.1
```

Update production `compose.prod.yml` to use those two tags, then on the VM run:

```bash
cd /home/azureuser/learnbridge
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml ps
curl -fsS https://maydoy.name.ng/api/health
```

The browser uses a new lesson cache namespace and a ten-minute cache lifetime, so users do not need to paste JavaScript or manually clear old lesson copies.
