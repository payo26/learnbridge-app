# LearnBridge v8.0.7 plant-diagram contamination fix

This cumulative overlay keeps the microscope correction and adds three plant safeguards:

- a reference to photosynthesis or plant cells in a later lesson can no longer select the plant plate;
- a newly generated Biology illustration is rejected if it contains an unrelated whole-plant, photosynthesis or plant-cell plate;
- the repair command removes only recognised plant diagrams from lessons whose actual topic does not require them.

The repair preserves lesson text, questions, learner progress, subscriptions and every unrelated diagram.

## 1. Extract the overlay over the existing project

Run in PowerShell:

```powershell
$Project = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-test\LearnBridge-v8.0.7-diagram-coverage"
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-plant-contamination-fix-overlay.zip"

Expand-Archive `
  -Path $Zip `
  -DestinationPath $Project `
  -Force

Set-Location $Project
```

## 2. Rebuild the API and web containers

```powershell
docker compose --env-file .\.env up -d --build --force-recreate api web

docker compose ps

Invoke-RestMethod http://localhost:8087/api/health |
  Format-List
```

## 3. Back up PostgreSQL before changing saved diagrams

```powershell
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Backup = ".\learnbridge-before-plant-repair-$Stamp.dump"
$DbId = docker compose --env-file .\.env ps -q db

docker compose --env-file .\.env exec -T db sh -c `
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/learnbridge-before-plant-repair.dump'

docker cp `
  "${DbId}:/tmp/learnbridge-before-plant-repair.dump" `
  $Backup

Get-Item $Backup |
  Format-List FullName,Length,LastWriteTime
```

Do not continue unless the backup file exists and its `Length` is greater than zero.

## 4. Preview the repair

This command is read-only:

```powershell
docker compose --env-file .\.env exec -T api `
  node repair-plant-contamination.mjs `
  --profile ng-senior `
  --year 10 `
  --subject biology
```

The output separates correct diagrams under `KEEP` from unrelated diagrams marked for removal. Confirm that genuine topics such as Cell Structure, Photosynthesis, Nutrition in Green Plants, Plant Parts or Transport in Plants are not in the removal list.

## 5. Apply the reviewed repair

```powershell
docker compose --env-file .\.env exec -T api `
  node repair-plant-contamination.mjs `
  --profile ng-senior `
  --year 10 `
  --subject biology `
  --apply
```

Run the preview command again. It should report no unrelated recurring plant diagrams.

## 6. Audit the repaired lessons

```powershell
$BaseUrl = "http://localhost:8087"

npm.cmd run audit-diagrams -- `
  --base-url $BaseUrl `
  --output .\diagram-audit-after-plant-fix.json

$Missing = (Get-Content .\diagram-audit-after-plant-fix.json -Raw | ConvertFrom-Json).lessons |
  Where-Object {
    $_.profile -eq "ng-senior" -and
    $_.year -eq 10 -and
    $_.subjectId -eq "biology" -and
    $_.coverageStatus -eq "missing"
  }

$Missing |
  Format-Table topicId,topicTitle,templateId,reason -AutoSize
```

Only backfill topics listed in `$Missing`. Check one topic first:

```powershell
$Topic = $Missing | Select-Object -First 1

npm.cmd run backfill-illustrations -- `
  --profile $Topic.profile `
  --year $Topic.year `
  --subject $Topic.subjectId `
  --topic $Topic.topicId `
  --force `
  --base-url $BaseUrl
```

Built-in templates do not use Azure. A topic without a built-in template can require one Azure request.

## Safety note

Do not run `docker compose down -v`; the `-v` option deletes the PostgreSQL volume containing the saved lessons.
