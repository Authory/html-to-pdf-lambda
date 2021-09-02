output "base_url" {
  description = "Base URL for API Gateway stage."

  value = aws_apigatewayv2_stage.lambda.invoke_url
}

output "service_url" {
  description = "URL service invocations."

  value = "${aws_apigatewayv2_stage.lambda.invoke_url}/html-to-pdf"
}

output "lambda_arn" {
  description = "ARN of the created Lambda function."

  value = aws_lambda_function.html_to_pdf.arn
}

output "repository_url" {
  description = "ECR repository URL for image."

  value = aws_ecr_repository.html_to_pdf.repository_url
}