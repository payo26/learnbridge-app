# LearnBridge v8.0.2 MathML Test 1

This package is for localhost evaluation only. Keep the online application on
v8.0.1 until the mathematics layout has been reviewed and approved.

## What changed

- Complete equations are rendered as native MathML rather than separate CSS
  fraction and bracket fragments.
- Numerators appear above denominators with a horizontal fraction bar.
- A fraction and its following variable remain together, for example
  `(3/4)x` is rendered as a stacked three-over-four followed by `x`.
- Brackets belong to the same mathematical row and stretch around tall
  fractions.
- Raw Markdown markers and escaped LaTeX delimiters are removed from lesson
  text.
- Existing textbook slash fractions in saved notes are rendered as stacked
  fractions without rewriting the database record.
- New AI-generated mathematics is instructed to preserve every variable and
  put each complete expression inside one pair of math delimiters.

## Local PowerShell test

Copy the `.env` from your working local LearnBridge project into this folder.
Do not copy the production VM `.env` through a public channel.

Set these local values:

```env
WEB_PORT=8081
APP_ORIGIN=http://localhost:8081
CORS_ORIGIN=http://localhost:8081
COOKIE_SECURE=false
```

Start this release in an isolated Compose project:

```powershell
docker compose `
  -p learnbridge-mathml-test `
  --env-file .\.env `
  up -d --build
```

Verify it:

```powershell
Invoke-RestMethod http://localhost:8081/api/health | Format-List
docker compose -p learnbridge-mathml-test --env-file .\.env ps
```

Expected health values include:

```text
version             : 8.0.2
mathematicsRenderer : native-mathml-1
database            : connected
```

First open the dedicated component preview:

```text
http://localhost:8081/?math-preview=1
```

This preview uses the same formatter as the lesson reader and includes the
exact reported equation, plain slash input, stretching brackets, roots and
powers.

Then open `http://localhost:8081`, sign in to the local test account, and inspect
mathematics lessons containing:

1. fractions followed by variables;
2. fractions inside round, square and curly brackets;
3. mixed numbers and fraction arithmetic;
4. roots, powers and subscripts;
5. worked examples, exercises, answers and checkpoint choices.

The intended display for the reported equation is a stacked `3 over 4`
followed by `x`, plus a stacked `1 over 2` followed by `x`, equals `1`.

If the source lesson itself omits a required variable, record the curriculum,
class, subject, topic and exact sentence. A renderer must not silently invent
mathematical content; that saved lesson should be corrected or regenerated.

## Stop the local test

```powershell
docker compose -p learnbridge-mathml-test --env-file .\.env down
```

Do not use `down -v` if you want to retain the isolated test database.
