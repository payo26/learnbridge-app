# LearnBridge CI/CD with protected Terraform deployment

This package adds Terraform validation to every pull request and push, while
keeping changes to Azure infrastructure manual. Normal pushes still test the
application, build immutable Docker images, deploy the exact commit tag to the
Azure VM, back up PostgreSQL, verify the public release, and roll back on error.

## Important production warning

The supplied Terraform described a **new West US `Standard_B1ms` VM**. The
current LearnBridge production VM is **East US `Standard_B2als_v2`**. Azure
cannot move an existing VM to another region in place. Do not choose
`terraform_action=apply` until the existing resources have been imported into
the remote state and the plan has been reconciled.

The included configuration intentionally provides three safeguards:

- Terraform never applies during an ordinary push or pull request.
- Plans containing a delete or replacement are blocked unless
  `allow_destructive=true` is explicitly selected.
- The resource group, VM and storage account use `prevent_destroy`.

The included configuration uses Ubuntu 24.04 for a **new** VM. Importing the
existing Ubuntu 18.04 VM will therefore show a replacement conflict, which the
safeguards block. Plan the operating-system migration separately.

## Workflow modes

| Trigger | Terraform | Application |
|---|---|---|
| Pull request | Format and validate only | Test and build only |
| Push to `main` | Format and validate only | Build, publish and deploy exact commit |
| Manual: `skip` | No Azure change | Optional application deployment |
| Manual: `plan` | Remote-state plan, never apply | Optional application deployment |
| Manual: `apply` | Plan, safety check, then apply | Optional application deployment |

Run `plan` first with `deploy_application=false`. Review its complete log before
considering a separate `apply` run.

## Required GitHub production environment

Create or reuse the GitHub environment named `production`. Keep its deployment
approval protection enabled.

### Existing secrets

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `VM_HOST`
- `VM_USER`
- `VM_SSH_PRIVATE_KEY`
- `VM_KNOWN_HOSTS`

### Terraform/OIDC secrets

- `AZURE_CLIENT_ID` — Microsoft Entra application/client ID
- `AZURE_TENANT_ID` — Microsoft Entra tenant ID
- `AZURE_SUBSCRIPTION_ID` — Azure subscription ID
- `VM_SSH_PUBLIC_KEY` — public key matching the VM private key
- `SSH_SOURCE_ADDRESS_PREFIX` — a trusted CIDR such as `203.0.113.10/32`; never
  use `*`

Configure a federated credential for the production environment with this
subject:

```text
repo:payo26/learnbridge-app:environment:production
```

The identity needs the least privilege necessary to manage the LearnBridge
resources. It also needs `Storage Blob Data Contributor` on the remote-state
storage account.

### Terraform backend variables

Create these GitHub **environment variables** (not secrets):

- `TFSTATE_RESOURCE_GROUP`
- `TFSTATE_STORAGE_ACCOUNT`
- `TFSTATE_CONTAINER`
- `TFSTATE_KEY` — recommended value: `learnbridge/production.tfstate`
- `AZURE_RESOURCE_GROUP` — optional; defaults to `learnbridgeapp-rg`
- `AZURE_NSG_NAME` — optional; defaults to `learnbridgeapp-nsg`

The state storage account and private blob container must already exist before
the first workflow plan. Use a dedicated state account rather than the
application storage account created by `main.tf`. Enable blob versioning and
soft delete on that account.

## First safe rollout

1. Install this overlay and push it to `main`. The first run validates Terraform
   but does not modify Azure.
2. Open **Actions → LearnBridge CI/CD → Run workflow**.
3. Select `terraform_action=plan`, `allow_destructive=false`, and
   `deploy_application=false`.
4. If the plan proposes creating resources that already exist, stop and import
   those existing Azure resource IDs into this state. Do not apply.
5. Reconcile the configuration with production. For the current VM this starts
   with East US and `Standard_B2als_v2`, not the West US/B1ms defaults.
6. Run another plan until it contains only the changes you intentionally want.
7. Use `apply` only after reviewing the plan and obtaining production approval.

If Terraform creates a new public IP, deployment deliberately stops when it
differs from `VM_HOST`. Update `VM_HOST` and regenerate `VM_KNOWN_HOSTS`, finish
bootstrapping `/home/azureuser/learnbridge` with `.env`, `compose.prod.yml` and
`Caddyfile`, then rerun with `terraform_action=skip`.

## Security and compatibility changes in the companion Terraform

- The subscription ID is supplied as a GitHub secret instead of committed.
- The SSH public key is supplied as a variable instead of read from the runner's
  `~/.ssh` directory.
- SSH is restricted to a trusted CIDR.
- Each deployment temporarily permits only that GitHub runner's public `/32`
  address on port 22 and removes the rule afterward, including after failures.
- HTTPS port 443 is allowed for Caddy.
- New VMs use Ubuntu 24.04 and install Docker through cloud-init.
- The storage container uses `storage_account_id`.
- Destructive lifecycle protection is enabled on critical resources.

`production.auto.tfvars.example` documents the requested West US/B1ms values;
it is not loaded automatically because its filename ends in `.example`.
