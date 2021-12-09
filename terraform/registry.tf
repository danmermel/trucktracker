resource "ibm_cr_namespace" "truckTrackerCR" {
  name              = "trucktracker"
  resource_group_id = ibm_resource_group.resource_group.id
}

output "cr_id" {
    value = ibm_cr_namespace.truckTrackerCR.id
}