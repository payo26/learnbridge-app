# LearnBridge GitHub Actions deployment

This workflow tests LearnBridge, generates the production frontend and SEO pages,
builds the API and web images, publishes immutable commit-tagged images to Docker
Hub, and deploys them to the existing Azure VM.

## Files

- `.github/workflows/deploy.yml`: CI/CD workflow.
- `compose.prod.yml`: reads the image tag from `IMAGE_TAG`, with `v8.0.8` as the fallback.

## GitHub configuration

Create a GitHub environment named `production`. Add a required reviewer before
allowing deployments if your GitHub plan supports environment protection rules.

Create these repository secrets:

- `DOCKERHUB_USERNAME`: `prayo25`
- `DOCKERHUB_TOKEN`: a Docker Hub personal access token with push permission

Create these secrets in the `production` environment:

- `VM_HOST`: `20.106.251.83`
- `VM_USER`: `azureuser`
- `VM_SSH_PRIVATE_KEY`: the complete private deployment key
- `VM_KNOWN_HOSTS`: the trusted SSH host-key entry for the VM

Do not store `.env`, Azure OpenAI keys, Paystack keys, SMTP credentials, database
passwords, or administrator passwords in the repository. They remain in
`/home/azureuser/learnbridge/.env` on the VM.

## Create a dedicated deployment key

Run in PowerShell:

```powershell
$KeyPath = "$env:USERPROFILE\.ssh\learnbridge_github_actions"
ssh-keygen -t ed25519 -C "github-actions-learnbridge" -f $KeyPath
Get-Content "$KeyPath.pub" |
  ssh azureuser@20.106.251.83 "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

Copy the complete contents of the file at `$KeyPath` into the
`VM_SSH_PRIVATE_KEY` production environment secret. Do not copy the `.pub` file
into that secret.

Capture the VM host key from a trusted computer after confirming the VM host-key
fingerprint:

```powershell
ssh-keyscan -H 20.106.251.83 | Out-File -Encoding ascii .\learnbridge-known-hosts.txt
Get-Content .\learnbridge-known-hosts.txt
```

Copy all output lines into `VM_KNOWN_HOSTS`.

## One-time VM configuration

Connect to the VM and ensure the production image tag is present:

```bash
cd /home/azureuser/learnbridge
grep -q '^IMAGE_TAG=' .env \
  && sed -i 's|^IMAGE_TAG=.*|IMAGE_TAG=v8.0.8|' .env \
  || printf '\nIMAGE_TAG=v8.0.8\n' >> .env
chmod 600 .env
```

Upload the updated `compose.prod.yml` to `/home/azureuser/learnbridge` before the
first automated deployment.

## Deployment behavior

- Pull requests run installation, tests, the frontend build and SEO generation.
- A push to `main`, or a manual workflow dispatch, additionally publishes both images.
- Images use `sha-<full-commit-sha>` for immutable production deployments.
- The workflow creates a database backup before replacing containers.
- Only API and web containers are replaced. The PostgreSQL container and volume remain.
- API, web and public HTTPS health checks must succeed.
- A failed health check restores the preceding `IMAGE_TAG` and recreates the preceding API and web containers.
- Deployment backups older than 14 days are removed from the VM.

## First run

Commit the workflow and updated Compose file to the `main` branch. Open the
repository's **Actions** tab and select **LearnBridge CI/CD**. Use **Run workflow**
for the first deployment, or push a commit to `main`.
