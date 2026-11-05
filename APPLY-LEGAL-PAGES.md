# LearnBridge v8.0.7 legal pages

This overlay adds public, printable pages at:

- `/terms`
- `/privacy`
- `/refunds`

It also adds footer links and keeps the existing Paystack registration links working with the production environment URLs.

## Apply locally

```powershell
$Project = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-test\LearnBridge-v8.0.7-diagram-coverage"
$Zip = "$env:USERPROFILE\Downloads\LearnBridge-v8.0.7-legal-pages-overlay.zip"

Expand-Archive -Path $Zip -DestinationPath $Project -Force
Set-Location $Project

npm.cmd test
npm.cmd run build

docker compose --env-file .\.env up -d --build --force-recreate web
```

Open:

```powershell
Start-Process "http://localhost:8087/terms"
Start-Process "http://localhost:8087/privacy"
Start-Process "http://localhost:8087/refunds"
```

## Production environment

Keep these exact values in the VM `.env`:

```env
TERMS_URL=https://learnbridge-app.com/terms
PRIVACY_URL=https://learnbridge-app.com/privacy
REFUND_POLICY_URL=https://learnbridge-app.com/refunds
TERMS_VERSION=2026-11-02
```

The documents are tailored operational drafts, not a substitute for legal advice. Before accepting live payments, have a Nigerian legal professional confirm the operator's registered name and address, refund windows, child-data arrangements, school data-processing responsibilities and support procedures.
