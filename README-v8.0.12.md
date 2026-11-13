# LearnBridge v8.0.12 — matrix and equation formatting

This is a source overlay for LearnBridge v8.0.10 or v8.0.11. It includes the
simultaneous-equation correction from v8.0.11 and adds textbook matrix layout.
You do not need to install v8.0.11 first.

## What this corrects

- Matrix entries render in genuine rows and columns using native MathML.
- `bmatrix`, `pmatrix`, `Bmatrix`, `vmatrix`, `Vmatrix`, `matrix`, and `array`
  environments are supported.
- Square brackets, round brackets, braces, determinant bars, and double bars
  stretch to the full matrix height.
- Older saved forms such as `[[1, 2], [3, 4]]` and `[1 2; 3 4]` are upgraded
  automatically when displayed.
- Closed intervals such as `[0, 1]` are not mistaken for matrices.
- Lesson-generation rules require correct matrix rows and columns in worked
  examples, practice questions, model answers, and checkpoint questions.
- Simultaneous equations remain arranged one equation per row under one brace.

No database migration is required. Do not delete the PostgreSQL volume, and do
not replace or remove your `.env` file.

## Apply the overlay on Windows PowerShell

Edit `$Zip` if the downloaded file is stored elsewhere. The project path below
matches the existing LearnBridge working folder used for v8.0.10.

```powershell
$Project = "C:\Users\PC\Downloads\LearnBridge-v8.0.7-test\LearnBridge-v8.0.7-diagram-coverage"
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.12-matrix-and-equation-formatting.zip"
$ExtractRoot = "$env:TEMP\LearnBridge-v8.0.12-overlay"

Remove-Item $ExtractRoot -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $Zip -DestinationPath $ExtractRoot -Force

$Overlay = Join-Path $ExtractRoot "LearnBridge-v8.0.12-matrix-and-equation-formatting"
Copy-Item "$Overlay\*" $Project -Recurse -Force

Set-Location $Project
(Get-Content .\package.json -Raw | ConvertFrom-Json).version
```

The final command must print `8.0.12`.

## Test and build

```powershell
npm.cmd test
npm.cmd run build
```

Expected results:

- all tests pass;
- the Vite production build succeeds; and
- the generated SEO-page step succeeds.

To test with the existing local Compose setup:

```powershell
docker compose --env-file .\.env up -d --build --force-recreate api web
Start-Sleep -Seconds 30
docker compose ps
```

Open the usual local LearnBridge URL. If this project uses port 8087, the
formatting preview is available at:

```powershell
Start-Process "http://localhost:8087/?math-preview=1"
```

Confirm the **Further Mathematics matrix** and **Legacy saved matrix** cards.
They should show rectangular 2 × 2 arrays with vertically aligned columns.

The local health response should report:

```json
{
  "version": "8.0.12",
  "mathematicsRenderer": "native-mathml-3"
}
```

## Deploy through the existing GitHub Actions pipeline

After local testing succeeds:

```powershell
git status --short
git add package.json package-lock.json `
  backend/package.json backend/package-lock.json backend/server.mjs `
  src/math-format.mjs src/MathPreview.tsx `
  tests/math-format.test.mjs
git commit -m "Release v8.0.12 matrix and equation formatting"
git push origin main
```

Watch the deployment:

```powershell
$RunId = gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $RunId --exit-status
```

Then verify production without relying on a cached response:

```powershell
$Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$Health = Invoke-RestMethod `
  "https://learnbridge-app.com/api/health?nocache=$Timestamp" `
  -Headers @{ "Cache-Control" = "no-cache"; "Pragma" = "no-cache" }

$Health.version
$Health.mathematicsRenderer
```

The expected values are `8.0.12` and `native-mathml-3`. Finally, open a Further
Mathematics matrix lesson in a private browser window or press `Ctrl+F5`.

## Verification performed before packaging

- curriculum validation passed;
- SEO validation passed;
- 62 automated project tests passed;
- matrix rows, columns, fences, determinant bars, legacy conversion, and
  interval protection were tested; and
- the production Vite build generated 210 static SEO pages (204 indexable).
