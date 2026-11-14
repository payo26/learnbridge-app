# LearnBridge v8.0.13 — production mathematics content fix

This cumulative source overlay can be applied directly to the current
LearnBridge project. It contains the v8.0.12 mathematics renderer and the
additional corrections required by the exact formats found in the deployed
lesson data.

## What this corrects

- Simultaneous-equation practice questions containing saved literal `\n`
  markers are decoded and displayed as two aligned equations under one brace.
- Ordinary LaTeX commands such as `\neq` remain unchanged.
- Saved matrices such as `[[4, 7], [2, 6]]` render as genuine rows and
  columns.
- Saved column vectors such as `[[x], [y]]` and `[[8], [7]]` render as
  textbook column matrices.
- Saved row vectors such as `[[1, 2, 3]]` also render correctly.
- Ordinary intervals such as `[0, 1]` are still left as ordinary text.
- The lesson-generation rules now explicitly prohibit visible literal newline
  markers and programming-style row or column vectors.

The fix is applied while displaying existing saved lessons, so no database
migration or lesson regeneration is required. Do not delete the PostgreSQL
volume and do not overwrite the project's `.env` file.

## Apply the overlay on Windows PowerShell

Change `$Zip` only if your downloaded ZIP is in another location.

```powershell
$Project = "C:\Users\PC\Downloads\LearnBridge-v8.0.7-test\LearnBridge-v8.0.7-diagram-coverage"
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.13-production-math-content-fix.zip"
$ExtractRoot = "$env:TEMP\LearnBridge-v8.0.13-overlay"

Remove-Item $ExtractRoot -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $Zip -DestinationPath $ExtractRoot -Force

$Overlay = Join-Path $ExtractRoot "LearnBridge-v8.0.13-production-math-content-fix"
Copy-Item "$Overlay\*" $Project -Recurse -Force

Set-Location $Project
(Get-Content .\package.json -Raw | ConvertFrom-Json).version
```

The last command must print `8.0.13`.

## Test and build

```powershell
npm.cmd test
npm.cmd run build
```

Expected result: all tests pass, the Vite build succeeds, and 210 static SEO
pages are generated.

To test with the existing local Compose project:

```powershell
docker compose --env-file .\.env up -d --build --force-recreate api web
Start-Sleep -Seconds 30
docker compose --env-file .\.env ps

$WebPort = ((docker compose --env-file .\.env port web 80).Trim() -split ":")[-1]
Start-Process "http://localhost:$WebPort/?math-preview=1"
```

The preview must show:

- the saved simultaneous-equation question as two rows under one brace; and
- `A`, `X`, and `B` as a 2 by 2 matrix and two column vectors.

Verify the local health response:

```powershell
$Health = Invoke-RestMethod "http://localhost:$WebPort/api/health"
$Health.version
$Health.mathematicsRenderer
```

Expected values: `8.0.13` and `native-mathml-4`.

## Deploy through the existing GitHub Actions pipeline

After local testing succeeds:

```powershell
git status --short
git add package.json package-lock.json `
  backend/package.json backend/package-lock.json backend/server.mjs `
  src/math-format.mjs src/MathPreview.tsx `
  tests/math-format.test.mjs README-v8.0.13.md

git commit -m "Release v8.0.13 production mathematics formatting fix"
git push origin main
```

Watch the workflow:

```powershell
$RunId = gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $RunId --exit-status
```

Verify production after the deployment completes:

```powershell
$Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$Health = Invoke-RestMethod `
  "https://learnbridge-app.com/api/health?nocache=$Timestamp" `
  -Headers @{ "Cache-Control" = "no-cache"; "Pragma" = "no-cache" }

$Health.version
$Health.mathematicsRenderer
```

Expected values: `8.0.13` and `native-mathml-4`. Then inspect the actual SS1
General Mathematics simultaneous-equations practice questions and the affected
Further Mathematics matrix lessons in an incognito browser window.

## Verification performed before packaging

- curriculum catalogue validation passed;
- SEO validation passed;
- all 64 automated project tests passed;
- regression tests cover the exact saved simultaneous-equation and matrix
  formats found in production; and
- the production build generated 210 static SEO pages, including 204 indexable
  pages.
