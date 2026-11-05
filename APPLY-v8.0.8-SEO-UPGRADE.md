# Apply the LearnBridge v8.0.8 SEO upgrade

This overlay is intended for the complete LearnBridge v8.0.7 diagram-coverage project. It does not contain `.env`, PostgreSQL data or generated lesson records.

## 1. Extract over v8.0.7

Open PowerShell and set the two paths to match your computer:

```powershell
$Project = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-test\LearnBridge-v8.0.7-diagram-coverage"
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.8-SEO-overlay.zip"

Test-Path $Project
Test-Path $Zip

Expand-Archive `
  -Path $Zip `
  -DestinationPath $Project `
  -Force

Set-Location $Project
```

Both `Test-Path` commands must return `True` before extraction.

## 2. Test and build

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
```

Expected results:

- 57 tests pass;
- the build reports `Generated 210 static SEO entry pages (204 indexable)`.

## 3. Run locally

Keep your existing `.env`. If another project uses port 8080, set an available port such as:

```env
WEB_PORT=8087
APP_ORIGIN=http://localhost:8087
CORS_ORIGIN=http://localhost:8087
COOKIE_SECURE=false
```

Then rebuild the containers:

```powershell
docker compose --env-file .\.env up -d --build --force-recreate api web
docker compose ps
Invoke-RestMethod http://localhost:8087/api/health | Format-List
```

The health response should include:

```text
version: 8.0.8
seoStaticPages: 210
seoIndexablePages: 204
```

## 4. Verify the public pages

```powershell
Start-Process "http://localhost:8087/"
Start-Process "http://localhost:8087/nigerian-curriculum"
Start-Process "http://localhost:8087/class/nigerian-year-7"
Start-Process "http://localhost:8087/subject/biology"
Start-Process "http://localhost:8087/sample/biology"

Invoke-WebRequest http://localhost:8087/robots.txt -UseBasicParsing |
  Select-Object -ExpandProperty Content

Invoke-WebRequest http://localhost:8087/sitemap.xml -UseBasicParsing |
  Select-Object StatusCode
```

An unknown route must return HTTP 404:

```powershell
try {
  Invoke-WebRequest http://localhost:8087/this-page-does-not-exist -UseBasicParsing
}
catch {
  [int]$_.Exception.Response.StatusCode
}
```

Expected output: `404`.

## 5. Build and push the production images

```powershell
docker build `
  -f backend/Dockerfile `
  -t prayo25/learnbridge-api:v8.0.8 `
  .

docker build `
  -t prayo25/learnbridge-web:v8.0.8 `
  .

docker push prayo25/learnbridge-api:v8.0.8
docker push prayo25/learnbridge-web:v8.0.8
```

## 6. Deploy to the Azure VM

Back up the database before changing the running containers. Keep the existing production `.env` and PostgreSQL volume.

After uploading `compose.prod.yml` to `/home/azureuser/learnbridge`:

```bash
cd /home/azureuser/learnbridge
chmod 600 .env
docker compose --env-file .env -f compose.prod.yml config --quiet
docker compose --env-file .env -f compose.prod.yml pull api web
docker compose --env-file .env -f compose.prod.yml up -d --force-recreate api web caddy
docker compose --env-file .env -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health | python3 -m json.tool
```

## 7. Submit the sitemap

After deployment:

1. Add `learnbridge-app.com` to Google Search Console.
2. Verify domain ownership through the DNS record supplied by Google.
3. Submit `https://learnbridge-app.com/sitemap.xml`.
4. Inspect and request indexing for the home page and both curriculum pages.

Search inclusion and ranking remain search-engine decisions and are not guaranteed by the upgrade.
