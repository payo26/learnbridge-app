# LearnBridge v8.0.7 microscopy diagram correction

This cumulative overlay includes the earlier Cell Structure correction and fixes **SS1 Biology — Microscopy and Cell Observation**.

The lesson topic now takes priority over secondary cell terminology in the note. The affected lesson receives a verified compound light microscope diagram with straight, direct callout leaders for the eyepiece, body tube, revolving nosepiece, objective lens, stage and slide, coarse- and fine-focus knobs, arm, condenser, built-in light source and base.

The coverage audit marks a previously saved cell diagram as mismatched, allowing the targeted backfill to replace it without changing the lesson-note text or making an Azure AI request.

## Apply on Windows PowerShell

Download the overlay ZIP and extract it directly into the existing `LearnBridge-v8.0.7-diagram-coverage` project. `-Force` replaces only the included source files. The overlay contains no `.env` file and does not modify the PostgreSQL volume.

```powershell
$Project = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-test\LearnBridge-v8.0.7-diagram-coverage"
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-microscopy-diagram-fix-overlay.zip"

Expand-Archive `
  -Path $Zip `
  -DestinationPath $Project `
  -Force

Set-Location $Project
```

Rebuild the API and web services:

```powershell
docker compose --env-file .\.env up -d --build --force-recreate api web
```

Use the port already assigned to the local v8.0.7 stack. These commands use port `8087`:

```powershell
$BaseUrl = "http://localhost:8087"
Invoke-RestMethod "$BaseUrl/api/health" | Format-List
```

Create a fresh coverage report and locate the affected lesson:

```powershell
npm.cmd run audit-diagrams -- `
  --base-url $BaseUrl `
  --output .\diagram-audit.json

$Audit = Get-Content .\diagram-audit.json -Raw | ConvertFrom-Json
$MicroscopyLesson = $Audit.lessons | Where-Object {
  $_.profile -eq "ng-senior" -and
  $_.year -eq 10 -and
  $_.subjectId -eq "biology" -and
  $_.topicTitle -match "Microscop|Cell Observation"
} | Select-Object -First 1

$MicroscopyLesson | Format-List profile,year,subjectId,topicId,topicTitle,templateId,coverageStatus

if ($null -eq $MicroscopyLesson) {
  throw "The saved SS1 Biology microscopy lesson was not found in this database."
}
```

Replace only its incorrect diagram:

```powershell
npm.cmd run backfill-illustrations -- `
  --profile $MicroscopyLesson.profile `
  --year $MicroscopyLesson.year `
  --subject $MicroscopyLesson.subjectId `
  --topic $MicroscopyLesson.topicId `
  --force `
  --base-url $BaseUrl
```

Expected result:

```text
Added 1 textbook diagram from a verified built-in template.
```

This template does not use Azure AI quota. Reopen the lesson after the command completes. The overlay changes the lesson browser-cache namespace, so the corrected microscope diagram loads without pasting JavaScript into the browser.

Run the audit once more to confirm coverage:

```powershell
npm.cmd run audit-diagrams -- `
  --base-url $BaseUrl `
  --output .\diagram-audit-after-microscopy-fix.json
```
