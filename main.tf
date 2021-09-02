## Lambda Setup

resource "aws_ecr_repository" "html_to_pdf" {
  name = "${var.function_name}-repo"
}

resource "aws_lambda_function" "html_to_pdf" {
  function_name = var.function_name
  memory_size                    = "1024"
  timeout                        = "900"
  package_type                   = "Image"

  image_uri = "${aws_ecr_repository.html_to_pdf.repository_url}:latest"
  
  role = aws_iam_role.lamda_role.arn
   
  image_config {
    command = ["/usr/local/bin/npx", "aws-lambda-ric", "index.handler"]
  }
}

resource "aws_iam_role" "lamda_role" {
  name = "${var.function_name}_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lamda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

## Gateway Setup

resource "aws_apigatewayv2_api" "lambda" {
  name          = "${var.function_name}-gateway"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "lambda" {
  api_id = aws_apigatewayv2_api.lambda.id

  name        = "${var.function_name}-stage"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn

    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
      }
    )
  }
}


resource "aws_security_group" "inbound_sg" {
  name        = "${var.function_name}-inbound-sg"
  description = "Allow inbound traffic to ${var.function_name} API gateway"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = var.allowed_security_groups
  }
}

resource "aws_apigatewayv2_vpc_link" "vpc_link" {
  name               = "${var.function_name}-link"
  security_group_ids = [aws_security_group.inbound_sg.id]
  subnet_ids         = var.subnet_ids

  tags = {
    Usage = "example"
  }
}

resource "aws_apigatewayv2_integration" "html_to_pdf" {
  api_id = aws_apigatewayv2_api.lambda.id

  integration_uri    = aws_lambda_function.html_to_pdf.invoke_arn
  integration_type   = "HTTP_PROXY"
  integration_method = "POST"


  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.vpc_link.id
}

resource "aws_apigatewayv2_route" "html_to_pdf" {
  api_id = aws_apigatewayv2_api.lambda.id

  route_key = "POST /html-to-pdf"
  target    = "integrations/${aws_apigatewayv2_integration.html_to_pdf.id}"
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

  retention_in_days = 30
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.html_to_pdf.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
}