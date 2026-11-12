# LearnBridge v8.0.9 — School licensing administrator controls

This update gives the LearnBridge platform administrator server-enforced control over school pilots, licence tiers, quotations, learner limits, campus scope, onboarding and manual licence changes.

## What is included

- Configurable pilot duration, learner seats and campus count. Defaults are 30 days and 50 learners.
- Starter: up to 150 active learners — ₦150,000 per term or ₦360,000 per session.
- Growth: up to 400 active learners — ₦350,000 per term or ₦840,000 per session.
- Professional: up to 1,000 active learners — ₦750,000 per term or ₦1,800,000 per session.
- Enterprise: negotiated pricing for more than 1,000 learners or multi-campus groups, with ₦2,400,000 as the displayed session starting point.
- Standard-tier pricing is calculated per campus; the administrator may override the recommended price for a negotiated quotation.
- Remote onboarding is included. An onsite onboarding fee can be added separately.
- Unlimited teacher and school-administrator accounts. Only active students consume learner seats.
- School administrators can invite additional administrators, teachers and students.
- Manual licence management for activation, extension, suspension, expiry and corrections.
- The server validates the final quotation and sends the exact stored amount to Paystack.
- Pilot approval does not create a payment or automatic renewal.

## Apply the overlay on Windows PowerShell

Run these commands from the folder containing your current complete v8.0.8 project. Replace the ZIP path if it is stored elsewhere.

```powershell
$Project = (Get-Location).Path
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.9-school-licensing-admin-overlay.zip"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Extract = Join-Path $env:TEMP "LearnBridge-v8.0.9-school-licensing-admin-$Stamp"
New-Item -ItemType Directory -Path $Extract | Out-Null

Expand-Archive -Path $Zip -DestinationPath $Extract -Force
Copy-Item "$Extract\*" $Project -Recurse -Force

npm.cmd test
npm.cmd run build
```

The overlay does not contain `.env`, cached lessons, database data or secrets.

## Deploy through the existing GitHub Actions pipeline

```powershell
git add package.json backend database src tests README-v8.0.9-school-licensing-admin.md
git commit -m "Add school licensing administrator controls"
git push origin main

gh run list --branch main --limit 3
```

The existing workflow builds commit-specific API and web images, backs up the production database, deploys the images and verifies the public health endpoint.

## Verify production

```powershell
Invoke-RestMethod https://learnbridge-app.com/api/health | Format-List
```

The response should contain `version : 8.0.9`.

Then sign in as the LearnBridge platform administrator and open the **Platform** dashboard. Test the following in this order:

1. Approve a pilot with chosen days, learner seats and campuses.
2. Copy the administrator invitation and create the school administrator account.
3. Issue a Starter, Growth, Professional or Enterprise quotation.
4. Confirm the school dashboard shows the tier, campus count, unlimited staff access and exact Paystack amount.
5. Create a second school-administrator invitation and a teacher invitation; confirm neither consumes a learner seat.
6. Use **Manage an existing school licence** to extend or suspend a test school.

## Database migration

The API applies the migration automatically at startup. It adds tier, campus, onboarding and unlimited-staff metadata to existing school and quotation records without deleting accounts, payments, subscriptions or cached lessons.

Always keep the database backup created by the deployment workflow until the update has been verified.

