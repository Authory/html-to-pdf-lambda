# html-to-pdf-lambda

Small lambda to convert HTML pages into PDFs, uses API Gateway.

## API

Request/event payload: 

```
{
  "html": "<p>Html here<p>",
  "format": "A4", // optional
  "printBackground": false // optional
  "margin": { "top": "1in", "right": "1in","bottom": "1in", "left": "1in" } // optional
}
```

Response: 

```
{
  "data": "..." // Pdf Document encoded as base 64.
}
```

## Deployment using terraform

To utilize this as terraform module, use the following:

```
module "html_to_pdf_service" {
  // Module source
  source = "git@github.com:Authory/html-to-pdf-lambda.git"

  // Name of the lambda function to create
  function_name = "html-to-pdf-${var.environment}"

  // Auth token to use (optional). The token needs to be sent in the Authorization header.
  auth_token = '12345'
}
```

This will create an api gateway and a lambda function linked to your VPC. 

Please note that you will need to upload the image to the ECR registry created by the script:

```
docker pull authory/html-to-pdf-lambda // or build locally. 

docker push authory/html-to-pdf-lambda XXXXXXXXXX.dkr.ecr.eu-west-1.amazonaws.com/html-to-pdf-XXXXXXXXX-repo
```

## Building the image

```
docker build -t authory/html-to-pdf-lambda .
```

## Running locally

To run locally, use aws-lambda-rie, as [outlined here](https://github.com/aws/aws-lambda-nodejs-runtime-interface-client#local-testing).

This downloads aws-lambda-rie to your home directory.

```
mkdir -p .aws-lambda-rie && \
    curl -Lo ~/.aws-lambda-rie/aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie && \
    chmod +x ~/.aws-lambda-rie/aws-lambda-rie
```

This includes it in the container.

```
sudo docker run  -v ~/.aws-lambda-rie:/aws-lambda -p 9000:8080 \
  --entrypoint /aws-lambda/aws-lambda-rie authory/html-to-pdf-lambda \
  /usr/local/bin/npx aws-lambda-ric index.handler
```

Invoking the container locally and storing the PDF: 

```
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{ "body": " { \"html\": \"<h1>Test</h1>\" }" }' | jq -r ".body.data" | base64 -d > test.pdf
```