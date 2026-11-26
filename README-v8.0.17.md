# LearnBridge v8.0.17 — brief student Mathematics notes

This overlay makes student Mathematics lessons brief and direct while preserving the complete teacher lesson note.

## Student Mathematics presentation

- Up to three short learning objectives.
- Up to four essential key terms with one-sentence definitions.
- Up to three core concept sections, each reduced to one direct sentence.
- Up to two worked examples with no more than four compact steps each.
- Up to four one-sentence summary points.
- All practice questions and checkpoint questions remain available.
- Practice answers, explanations and checkpoint answer keys remain hidden and server-protected.

Teacher Mathematics notes remain complete. Non-Mathematics subjects are unchanged.

The browser lesson-cache version is updated so the earlier longer student notes are not reused. No database migration or lesson regeneration is required.

## Verification

```powershell
npm.cmd test
npm.cmd run build
```

After rebuilding Docker, verify:

```powershell
$WebPort = ((docker compose --env-file .\.env port web 80).Trim() -split ":")[-1]

Invoke-RestMethod "http://localhost:$WebPort/api/health" |
  Select-Object version,lessonInterfaces,briefStudentMathematics
```

Expected:

```text
version                  8.0.17
lessonInterfaces         role-separated-v4
briefStudentMathematics  True
```
