variable "function_name" {
  type = string
}
variable "allowed_security_groups" {
  type = list(string)
}
variable "vpc_id" {
  type = string
}
variable "subnet_ids" {
  type = list(string)
}