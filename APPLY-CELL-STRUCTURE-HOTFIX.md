# LearnBridge v8.0.7 Cell Structure hotfix

This hotfix prevents a mention of photosynthesis inside a Cell Structure lesson from selecting the whole-flowering-plant diagram. The lesson topic now takes precedence over secondary concepts in the note. A plant-cell lesson receives a labelled plant-cell cross-section, while animal-cell and comparison lessons retain their appropriate cell templates.

The coverage audit also treats an unrelated saved diagram as missing. This lets the targeted backfill replace the wrong diagram without changing the lesson note text.

## Apply on Windows PowerShell

Extract this ZIP over the existing `LearnBridge-v8.0.7-diagram-coverage` project and choose **Replace the files in the destination**. The archive does not contain `.env` and does not touch the PostgreSQL volume.

From the project directory, rebuild both services:

```powershell
docker compose --env-file .\.env up -d --build --force-recreate api web
```

Use the same localhost port already assigned to v8.0.7. The examples below use port `8087`:

```powershell
$BaseUrl = "http://localhost:8087"
Invoke-RestMethod "$BaseUrl/api/health" | Format-List
```

Create a fresh audit report and locate the saved SS1 Biology Cell Structure lesson:

```powershell
npm.cmd run audit-diagrams -- `
  --base-url $BaseUrl `
  --output .\diagram-audit.json

$Audit = Get-Content .\diagram-audit.json -Raw | ConvertFrom-Json
$CellLesson = $Audit.lessons | Where-Object {
  $_.profile -eq "ng-senior" -and
  $_.year -eq 10 -and
  $_.subjectId -eq "biology" -and
  $_.topicTitle -match "Cell Structure"
} | Select-Object -First 1

$CellLesson | Format-List profile,year,subjectId,topicId,topicTitle,templateId,coverageStatus
```

Replace only that lesson's diagram. This uses the verified built-in plant-cell template and makes no Azure request:

```powershell
npm.cmd run backfill-illustrations -- `
  --profile $CellLesson.profile `
  --year $CellLesson.year `
  --subject $CellLesson.subjectId `
  --topic $CellLesson.topicId `
  --force `
  --base-url $BaseUrl
```

Run the audit again:

```powershell
npm.cmd run audit-diagrams -- `
  --base-url $BaseUrl `
  --output .\diagram-audit-after-cell-fix.json
```

Close the old lesson tab and reopen LearnBridge. The web cache namespace is changed by this hotfix, so the corrected diagram loads without pasting JavaScript into the browser.

If `$CellLesson` is empty, confirm that the SS1 Cell Structure full lesson is saved in this local database and inspect all Biology entries:

```powershell
$Audit.lessons | Where-Object {
  $_.profile -eq "ng-senior" -and $_.year -eq 10 -and $_.subjectId -eq "biology"
} | Format-Table topicId,topicTitle,templateId,coverageStatus -AutoSize
```
