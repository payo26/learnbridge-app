# LearnBridge v8.0.7 microscope-contamination correction

This cumulative overlay includes the earlier plant-cell and microscopy corrections. It prevents a microscope mentioned inside later SS1 Biology lesson text from selecting the microscopy template.

It also includes a scoped repair utility. The utility protects the correct microscopy topic (`t3`), finds the exact built-in microscope diagram in every other SS1 Biology record, and removes only that copied diagram. Lesson text, quizzes, progress, subscriptions and unrelated diagrams are preserved.

## 1. Apply the overlay

```powershell
$Project = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-test\LearnBridge-v8.0.7-diagram-coverage"
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-microscope-contamination-fix-overlay.zip"

Expand-Archive `
  -Path $Zip `
  -DestinationPath $Project `
  -Force

Set-Location $Project

docker compose --env-file .\.env up -d --build --force-recreate api web
```

Verify the stack:

```powershell
$BaseUrl = "http://localhost:8087"
Invoke-RestMethod "$BaseUrl/api/health" | Format-List
docker compose ps
```

## 2. Back up the local database

```powershell
docker compose exec -T db `
  pg_dump -U learnbridge -d learnbridge `
  > .\learnbridge-before-microscope-repair.sql

Get-Item .\learnbridge-before-microscope-repair.sql |
  Format-List FullName,Length,LastWriteTime
```

Confirm that `Length` is greater than zero before continuing.

## 3. Preview the affected lessons

This command is read-only:

```powershell
docker compose --env-file .\.env exec -T api `
  node repair-microscope-contamination.mjs `
  --profile ng-senior `
  --year 10 `
  --subject biology `
  --keep-topic t3
```

Review every listed topic. The correct microscopy lesson `t3` is protected and must not appear in the removal list.

## 4. Apply the scoped repair

```powershell
docker compose --env-file .\.env exec -T api `
  node repair-microscope-contamination.mjs `
  --profile ng-senior `
  --year 10 `
  --subject biology `
  --keep-topic t3 `
  --apply
```

Expected final line:

```text
Repaired lessons: <number>
```

## 5. Audit the repaired lessons

```powershell
npm.cmd run audit-diagrams -- `
  --base-url $BaseUrl `
  --output .\diagram-audit-after-contamination-fix.json

$Audit = Get-Content .\diagram-audit-after-contamination-fix.json -Raw |
  ConvertFrom-Json

$Audit.lessons | Where-Object {
  $_.profile -eq "ng-senior" -and
  $_.year -eq 10 -and
  $_.subjectId -eq "biology"
} | Format-Table topicId,topicTitle,templateId,coverageStatus,illustrationCount -AutoSize
```

The microscopy topic should remain covered by `compound-light-microscope`. Repaired diagram-dependent lessons may show `missing` because their incorrect microscope copy was safely removed.

Preview any diagrams that now need replacement:

```powershell
npm.cmd run backfill-illustrations -- `
  --profile ng-senior `
  --year 10 `
  --subject biology `
  --dry-run `
  --base-url $BaseUrl
```

If the preview is correct, run the same command without `--dry-run`:

```powershell
npm.cmd run backfill-illustrations -- `
  --profile ng-senior `
  --year 10 `
  --subject biology `
  --base-url $BaseUrl
```

Verified built-in templates consume no Azure quota. A listed lesson without a built-in template can require one Azure request.

Open the application after the repair:

```powershell
Start-Process $BaseUrl
```

The overlay changes the browser lesson-cache namespace, so corrected lesson records are fetched without pasting JavaScript into the browser.
