## Lambda Setup

resource "aws_ecr_repository" "html_to_pdf" {
  name = "${var.function_name}-repo"
}

resource "aws_s3_bucket" "pdf_bucket" {
  bucket = var.function_name

  dynamic "lifecycle_rule" {
    content {
      id      = "autoremove"
      enabled = true

      expiration {
        days = 2
      }
    }
  }
}

resource "aws_lambda_function" "html_to_pdf" {
  function_name = var.function_name
  memory_size                    = "4096"
  timeout                        = "900"
  package_type                   = "Image"

  image_uri = "${aws_ecr_repository.html_to_pdf.repository_url}:latest"
  
  role = aws_iam_role.lamda_role.arn
   
  image_config {
     command = ["index.handler"]
  }

  environment {
    variables = {
      HTML_TO_PDF_SERVICE_TOKEN = var.auth_token
      PDF_BUCKET_NAME = aws_s3_bucket.pdf_bucket.name
    }
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

resource "aws_iam_policy" "s3-pdf-policy" {
  name        = "pdf_upload_policy"
  path        = "/"
  description = "Upload PDF policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
        ]
        Effect   = "Allow"
        Resource =  aws_s3_bucket.pdf_bucket.name
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lamda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_s3_policy" {
  role       = aws_iam_role.lamda_role.name
  policy_arn = aws_iam_policy.s3-pdf-policy.arn
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

resource "aws_apigatewayv2_integration" "html_to_pdf" {
  api_id = aws_apigatewayv2_api.lambda.id

  integration_uri    = aws_lambda_function.html_to_pdf.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"


  connection_type    = "INTERNET"
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