output "public_ip_address" {
  description = "Static public IPv4 address of the LearnBridge VM."
  value       = azurerm_public_ip.learnbridgeapp_pip.ip_address
}

output "resource_group_name" {
  description = "LearnBridge Azure resource group name."
  value       = azurerm_resource_group.learnbridgeapp_rg.name
}

output "virtual_machine_id" {
  description = "Azure resource ID of the LearnBridge VM."
  value       = azurerm_linux_virtual_machine.learnbridgeapp_vm.id
}
