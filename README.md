# LearnBridge v8.0.8 - SEO-ready audited learning platform

LearnBridge v8.0.8 is an independent full-stack learning platform with Nigerian and British curriculum pathways in one account. Version 8.0.8 preserves the v8.0.7 diagram coverage, native MathML, password recovery, subscriptions and legal pages, and adds static SEO entry pages, class and subject URLs, public sample URLs, structured data, a sitemap, crawl controls and proper 404 handling.

- Nigerian revised and earlier/transitioning junior and senior secondary frameworks;
- England Key Stage 3 and Key Stage 4 subject areas;
- GCSE and Cambridge IGCSE choices for Years 10-11;
- Cambridge International AS & A Level choices for Year 12;
- public sample lessons, paid individual and family subscriptions, and school licensing;
- saved PostgreSQL lesson notes, labelled textbook diagrams, real medical anatomy plates, biological specimens, and real Nigeria, Africa and West Africa map boundaries;
- controlled Azure OpenAI generation only for content that has not already been saved.

British and Nigerian plans use separate profile-aware cache keys. Existing Nigerian notes therefore remain intact when British plans and notes are added.

## Curriculum scope

| Pathway | LearnBridge classes | Profile | Subject entries |
| --- | --- | --- | ---: |
| Nigerian revised junior | Years 7-9 / JSS 1-3 | `ng-junior` | 20 |
| Nigerian revised senior | Years 10-12 / SS 1-3 | `ng-senior` | 36 |
| Nigerian earlier junior | Years 7-9 / JSS 1-3 | `ng-old-junior` | 20 |
| Nigerian earlier senior | Years 10-12 / SS 1-3 | `ng-old-senior` | 72 |
| British lower secondary | Years 7-9 / England KS3 | `uk-junior` | 15 |
| British upper secondary | Years 10-11 / KS4, GCSE and IGCSE | `uk-senior` | 64 |
| British post-16 | Year 12 / AS & A-level choices | `uk-post16` | 48 |

The British catalogue follows England national-curriculum subject areas and includes Cambridge international qualification choices. It is study support, not a claim that all subjects are compulsory, that every UK nation uses the same curriculum, or that every school/exam board offers every option. Generated plans and notes should be checked against the learner's current school scheme and examination syllabus.

Official references:

- <https://www.gov.uk/national-curriculum/key-stage-3-and-4>
- <https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/>
- <https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/>

Run the catalogue validator at any time:

```powershell
npm.cmd run validate:curricula
```

## Important upgrade rule

Do not delete the existing PostgreSQL volume. The v8 API performs idempotent schema updates and preserves the existing `content_cache`, users, subscriptions, payments, pilots and licences.

Before upgrading production:

```bash
cd /home/azureuser/learnbridge
docker compose -f compose.prod.yml exec -T db \
  pg_dump -U learnbridge -d learnbridge -Fc -f /tmp/learnbridge-before-v8.dump
DB_ID=$(docker compose -f compose.prod.yml ps -q db)
docker cp "$DB_ID:/tmp/learnbridge-before-v8.dump" ./learnbridge-before-v8.dump
ls -lh learnbridge-before-v8.dump
```

Never run `docker compose down -v` on production. The `-v` option deletes the named database volume.

For a folder-to-folder Windows upgrade, follow `MIGRATE-v7.2-TO-v8.md` before starting the new stack.

## Local start on Windows

From PowerShell in the v8 project directory:

```powershell
Copy-Item .env.example .env
notepad .env
npm.cmd install
npm.cmd test
npm.cmd run build
docker compose up -d --build
docker compose ps
Invoke-RestMethod http://localhost:8080/api/health
```

For local HTTP, retain:

```env
APP_ORIGIN=http://localhost:8080
CORS_ORIGIN=http://localhost:8080
COOKIE_SECURE=false
```

Open <http://localhost:8080>. A successful health response reports version `8.0.8`, both curricula, a connected database, the SEO page counts and the existing licensing/payment status.

## Search visibility

The production build generates 210 static entry pages, including 204 indexable pages for the home page, both curriculum pathways, Years 7-12, 160 subjects, 23 free samples, plans, schools and legal information. Secure dashboards and API responses remain `noindex`.

Important URLs:

- `https://learnbridge-app.com/robots.txt`
- `https://learnbridge-app.com/sitemap.xml`
- `https://learnbridge-app.com/nigerian-curriculum`
- `https://learnbridge-app.com/british-curriculum`
- `https://learnbridge-app.com/class/nigerian-year-7`
- `https://learnbridge-app.com/subject/biology`
- `https://learnbridge-app.com/sample/biology`

After deployment, verify `learnbridge-app.com` in Google Search Console, submit the sitemap and request indexing for the home and curriculum pages. Search engines determine whether and when pages are indexed; the build cannot guarantee ranking.

## Precise diagram labels

The renderer keeps descriptive labels outside the illustrated object and connects each label directly to its feature with one straight arrowed leader. Labels on each side are ordered by their actual target position, so their boxes and leader lines do not overlap. Compact notation such as axis letters, chemical symbols, numerical values and vertices may remain inside the drawing.

This is renderer version 6. It retains named anchors for detailed flowering-plant, goat, bird and fish specimens and ten bundled anatomy plates for the digestive, respiratory, circulatory, skeletal, nervous, urinary, endocrine, lymphatic, muscular and female reproductive systems. It also recognises compact scientific notation such as `e⁻`, `p⁺` and `n⁰` as internal labels instead of moving them into external boxes.

## Standard chemical equations

Chemical formulae and equations use native MathML. Atom counts are true subscripts, ionic charges are superscripts, coefficients remain on the baseline, and state symbols are preserved. Both `2H_2 + O_2 → 2H_2O` and `2H2 + O2 -> 2H2O` display as standard textbook notation.

Use these local quality-check pages after startup:

- <http://localhost:8080/?math-preview=1> for mathematics and chemistry notation;
- <http://localhost:8080/?diagram-preview=1> for the complete human anatomy plate and label review page;
- <http://localhost:8080/?coverage-preview=1> for the built-in diagram coverage catalogue.

## Password recovery email

The sign-in card includes **Forgot your password?**. Reset links are random, stored only as hashes, expire after 30 minutes, work once and close all existing sessions after use. Configure an SMTP mailbox in `.env` before enabling production recovery:

```env
SMTP_HOST=smtp.your-email-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=no-reply@learnbridge-app.com
SMTP_PASSWORD=replace_with_your_smtp_password_or_app_password
SMTP_FROM="LearnBridge <no-reply@learnbridge-app.com>"
SMTP_REPLY_TO=support@learnbridge-app.com
```

Use the exact server, port and credentials supplied by the mailbox provider. Do not commit `.env` or SMTP credentials to source control. The health endpoint reports `passwordRecoveryConfigured: true` only when SMTP and `APP_ORIGIN` are valid.

## Azure OpenAI

Use the exact endpoint and deployment name from your working installation:

```env
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/openai/v1
AZURE_OPENAI_API_KEY=replace_with_your_key
AZURE_OPENAI_DEPLOYMENT=your_exact_deployment_name
```

Saved content opens without a new AI request. Only missing topic plans, lesson sections or illustrations use Azure OpenAI. Anonymous visitors cannot generate content; they can read only saved public samples.

## Balanced British preload strategy

The v8 default is deliberately staged:

1. Validate the full subject catalogue.
2. Generate public Topic 1 samples across British profiles.
3. Generate complete core coverage for English, mathematics and science at KS3, plus English Language, English Literature, Mathematics and Combined Science at KS4.
4. Generate optional GCSE/IGCSE and post-16 subjects in batches when schools or subscribers need them.

There are no universally compulsory Year 12 subjects, so post-16 options are not included in the core preset.

Preview the core job without making API calls:

```powershell
npm.cmd run preload:british-core -- --dry-run
```

Generate a small core batch first:

```powershell
npm.cmd run preload:british-core -- --max-lessons 5
```

Resume until the complete British core set is saved:

```powershell
npm.cmd run preload:british-core -- --yes
```

Generate one public sample for every British class/subject combination:

```powershell
npm.cmd run preload:british-samples -- --yes
```

For the deployed service, add the base URL:

```powershell
npm.cmd run preload:british-core -- --base-url https://learnbridge-app.com --max-lessons 5
```

Generate selected subjects only:

```powershell
npm.cmd run preload -- `
  --base-url https://learnbridge-app.com `
  --profile uk-junior `
  --year 7 `
  --subjects english,mathematics,science `
  --max-lessons 6
```

The script reads `PRELOAD_TOKEN` from `.env`, checkpoints completed lessons, and safely resumes. Each uncached lesson can require up to four Azure content requests; illustrations may require an additional request. Review Azure quota and cost before using `--yes` on a large selection.

## Textbook diagram coverage audit

Version 6 scans the title and saved lesson content—not only the subject name—to identify diagram-dependent concepts. It includes verified built-in templates for latitude and longitude, food chains, the water cycle, photosynthesis, plant and animal cells, atomic structure, a series circuit, a soil profile and the rock cycle, plus ten real anatomy plates. Other detected topics are queued for a constrained, subject-specific Azure diagram request.

Every built-in diagram uses a 960 by 600 canvas, external collision-aware label columns, straight arrowed leaders terminating on the named feature, and the same validator used for generated diagrams. Human body-system lessons use bundled medical plates. Whole plants and animals use recognisable specimen templates. Geographic political maps use real Nigeria, Africa and West Africa boundaries. Generic flowcharts and decorative diagrams are rejected unless the lesson itself teaches a sequence or hierarchy.

Geographic lessons use bundled boundary paths for Nigeria, Africa and West Africa. Azure AI can select and label a map template but cannot redraw its boundaries. Attribution appears under each map and in `MAP-DATA-NOTICE.md`.

Audit every complete lesson already stored in PostgreSQL without changing it:

```powershell
npm.cmd run audit-diagrams -- `
  --base-url http://localhost:8080 `
  --output .\diagram-audit.json
```

Preview only the missing diagrams before making Azure requests:

```powershell
npm.cmd run backfill-illustrations -- `
  --all `
  --dry-run `
  --base-url http://localhost:8080
```

Backfill a small selection first:

```powershell
npm.cmd run backfill-illustrations -- `
  --base-url https://learnbridge-app.com `
  --profile uk-junior `
  --year 7 `
  --subject science `
  --max-lessons 5
```

After reviewing the dry run, process all saved lessons that the audit marks as missing:

```powershell
npm.cmd run backfill-illustrations -- `
  --all `
  --yes `
  --base-url http://localhost:8080
```

The scripts read `PRELOAD_TOKEN` from `.env`. Built-in templates do not use Azure. A missing diagram without a built-in template can require one Azure request. Only complete notes already present in `content_cache` are scanned; this command does not generate missing lesson notes and does not delete or replace the database volume.

## Paystack and access packages

The existing v7.2 commercial system is preserved:

- public saved samples;
- Individual Monthly and Annual plans;
- Family Monthly and Annual plans, with up to five learner profiles;
- reviewed 30-day, 25-seat school pilots;
- custom termly or annual school quotations;
- hosted Paystack checkout, verification and signed renewal webhooks;
- account, school and platform administrator dashboards.

Both Nigerian and British lessons use the same active entitlement. Subscribers and licensed school users do not need a separate payment for each curriculum.

Required Paystack variables:

```env
PAYSTACK_SECRET_KEY=sk_test_replace_me
PAYSTACK_INDIVIDUAL_MONTHLY_PLAN=PLN_replace_me
PAYSTACK_INDIVIDUAL_ANNUAL_PLAN=PLN_replace_me
PAYSTACK_FAMILY_MONTHLY_PLAN=PLN_replace_me
PAYSTACK_FAMILY_ANNUAL_PLAN=PLN_replace_me
```

Use the webhook URL:

```text
https://learnbridge-app.com/api/paystack/webhook
```

Keep the secret key on the API server only. Do not place it in `src/`, a screenshot, Docker Hub, or Git.

## Build and push v8 images

The web Dockerfile packages the existing `dist` directory, so build the frontend first:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
docker build -f backend/Dockerfile -t prayo25/learnbridge-api:v8.0.8 .
docker build -t prayo25/learnbridge-web:v8.0.8 .
docker login -u prayo25
docker push prayo25/learnbridge-api:v8.0.8
docker push prayo25/learnbridge-web:v8.0.8
```

Confirm both images exist in Docker Hub before changing production.

## Upgrade the Azure VM

Back up the database first. Then place the v8 `compose.prod.yml` and `Caddyfile` in `/home/azureuser/learnbridge`. Keep the existing production `.env` and database volume.

```bash
cd /home/azureuser/learnbridge
chmod 600 .env
docker compose -f compose.prod.yml config --quiet
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml ps
curl -fsS https://learnbridge-app.com/api/health
```

Expected health fields include:

- `version: 8.0.8`
- `seoStaticPages: 210`
- `seoIndexablePages: 204`
- `passwordRecoveryConfigured: true` after SMTP is configured
- `curricula: [Nigerian, British]`
- `database: connected`
- `chemistryRenderer: native-mathml-1`
- `illustrationVersion: 6`
- `illustrationRendererVersion: 6`
- `diagramCoverageAudit: true`
- `curatedDiagramTemplates: 19`
- `anatomyPlateCount: 10`
- `schoolLicensing: true`
- `consumerSubscriptions: true`

Watch startup when troubleshooting:

```bash
docker compose -f compose.prod.yml logs -f --tail 150 api
```

## Production checks

- Confirm the database backup can be restored.
- Confirm Nigerian saved notes still open after the upgrade.
- Switch to British, open Years 7, 10 and 12, and verify their subject lists.
- Sign out and confirm only saved Topic 1 samples open.
- Sign in with a paid individual/family account and confirm restricted lessons open in both pathways.
- Sign in with an active school learner and confirm the same.
- Run a small British core preload and inspect its notes and illustrations.
- Test a Paystack test-mode subscription and signed webhook before accepting live money.
- Publish professionally reviewed Terms, Privacy and Refund policies before live sales.

## Useful commands

```bash
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs --tail 150 api
docker compose -f compose.prod.yml restart api
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

Use `docker compose down` only when intentionally stopping the stack. Never add `-v` in production.
