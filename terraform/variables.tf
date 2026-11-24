variable "subscription_id" {
  description = "Azure subscription that owns the LearnBridge infrastructure."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.subscription_id))
    error_message = "subscription_id must be an Azure subscription GUID."
  }
}

variable "location" {
  description = "Azure region for a new LearnBridge environment. Changing an existing resource's region can force replacement."
  type        = string
  default     = "West US"
}

variable "resource_group_name" {
  description = "LearnBridge Azure resource group name."
  type        = string
  default     = "learnbridgeapp-rg"
}

variable "vm_name" {
  description = "LearnBridge production virtual-machine name."
  type        = string
  default     = "learnbridgeapp-vm"
}

variable "vm_size" {
  description = "Azure VM SKU for a new LearnBridge environment."
  type        = string
  default     = "Standard_B1ms"
}

variable "admin_username" {
  description = "Linux administrator account used by the deployment workflow."
  type        = string
  default     = "azureuser"
}

variable "admin_ssh_public_key" {
  description = "Public SSH key for the Linux administrator. Supply it through TF_VAR_admin_ssh_public_key."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ssh-(rsa|ed25519|ecdsa)", trimspace(var.admin_ssh_public_key)))
    error_message = "admin_ssh_public_key must contain a valid OpenSSH public key."
  }
}

variable "ssh_source_address_prefix" {
  description = "Trusted public CIDR permitted to reach SSH, for example 203.0.113.10/32. Do not use * in production."
  type        = string
  sensitive   = true

  validation {
    condition     = var.ssh_source_address_prefix != "*" && can(cidrhost(var.ssh_source_address_prefix, 0))
    error_message = "ssh_source_address_prefix must be a restricted IPv4 or IPv6 CIDR and cannot be *."
  }
}

variable "storage_account_name" {
  description = "Globally unique storage-account name for LearnBridge application storage."
  type        = string
  default     = "learnbridgeappsa"

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "storage_account_name must contain 3-24 lowercase letters and numbers."
  }
}

variable "tags" {
  description = "Tags added to LearnBridge Azure resources."
  type        = map(string)
  default = {
    application = "learnbridge"
    environment = "production"
    managed_by  = "terraform"
  }
}
