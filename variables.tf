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

variable "image_uri" {
  type = string
  default = "registry.hub.docker.com/authory/html-to-pdf-lambda"
}