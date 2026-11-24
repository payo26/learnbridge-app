terraform {
  required_version = ">= 1.9, < 2.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.57.0"
    }
  }
}

provider "azurerm" {
  features {}

  subscription_id = var.subscription_id
}

resource "azurerm_resource_group" "learnbridgeapp_rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_virtual_network" "learnbridgeapp_vnet" {
  name                = "learnbridgeapp-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.learnbridgeapp_rg.location
  resource_group_name = azurerm_resource_group.learnbridgeapp_rg.name
  tags                = var.tags
}

resource "azurerm_subnet" "learnbridgeapp_subnet" {
  name                 = "learnbridgeapp-subnet"
  resource_group_name  = azurerm_resource_group.learnbridgeapp_rg.name
  virtual_network_name = azurerm_virtual_network.learnbridgeapp_vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_public_ip" "learnbridgeapp_pip" {
  name                = "learnbridgeapp-pip"
  location            = azurerm_resource_group.learnbridgeapp_rg.location
  resource_group_name = azurerm_resource_group.learnbridgeapp_rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags
}

resource "azurerm_network_interface" "learnbridgeapp_nic" {
  name                = "learnbridgeapp-nic"
  location            = azurerm_resource_group.learnbridgeapp_rg.location
  resource_group_name = azurerm_resource_group.learnbridgeapp_rg.name
  tags                = var.tags

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.learnbridgeapp_subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.learnbridgeapp_pip.id
  }
}

resource "azurerm_network_security_group" "learnbridgeapp_nsg" {
  name                = "learnbridgeapp-nsg"
  location            = azurerm_resource_group.learnbridgeapp_rg.location
  resource_group_name = azurerm_resource_group.learnbridgeapp_rg.name
  tags                = var.tags

  security_rule {
    name                       = "allow_ssh_from_trusted_cidr"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.ssh_source_address_prefix
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_http"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_https"
    priority                   = 1003
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface_security_group_association" "learnbridgeapp_nic_nsg_association" {
  network_interface_id      = azurerm_network_interface.learnbridgeapp_nic.id
  network_security_group_id = azurerm_network_security_group.learnbridgeapp_nsg.id
}

resource "azurerm_linux_virtual_machine" "learnbridgeapp_vm" {
  name                = var.vm_name
  resource_group_name = azurerm_resource_group.learnbridgeapp_rg.name
  location            = azurerm_resource_group.learnbridgeapp_rg.location
  size                = var.vm_size
  admin_username      = var.admin_username
  tags                = var.tags

  disable_password_authentication = true

  network_interface_ids = [
    azurerm_network_interface.learnbridgeapp_nic.id,
  ]

  admin_ssh_key {
    username   = var.admin_username
    public_key = trimspace(var.admin_ssh_public_key)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  custom_data = base64encode(<<-CLOUD_INIT
    #cloud-config
    package_update: true
    packages:
      - ca-certificates
      - curl
      - docker.io
      - docker-compose-v2
    runcmd:
      - systemctl enable --now docker
      - usermod -aG docker ${var.admin_username}
      - install -d -o ${var.admin_username} -g ${var.admin_username} /home/${var.admin_username}/learnbridge
  CLOUD_INIT
  )

  boot_diagnostics {}

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_storage_account" "learnbridgeapp_sa" {
  name                            = var.storage_account_name
  resource_group_name             = azurerm_resource_group.learnbridgeapp_rg.name
  location                        = azurerm_resource_group.learnbridgeapp_rg.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  tags                            = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_storage_container" "learnbridgeapp_container" {
  name                  = "learnbridgeapp-container"
  storage_account_id    = azurerm_storage_account.learnbridgeapp_sa.id
  container_access_type = "private"
}
