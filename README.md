# html-to-pdf-lambda

Small lambda to convert HTML pages into PDFs, exposed via API Gateway.

Includes a terraform module.

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

This will create an api gateway and a lambda function linked.

Please note that you will need to upload the image to the ECR registry created by the docker file:

```
docker pull authory/html-to-pdf-lambda // or build locally.

docker push authory/html-to-pdf-lambda XXXXXXXXXX.dkr.ecr.eu-west-1.amazonaws.com/html-to-pdf-XXXXXXXXX-repo
```

This is because AWS Lambda can not pull images from dockerhub.

## Building the image

```
docker build -t authory/html-to-pdf-lambda .
```

## Running locally

Build the image

```
docker build -t authory/html-to-pdf-lambda .
```

Run the image

```
docker run -e PDF_BUCKET_NAME="<BUCKET_NAME>" -e AWS_ACCESS_KEY_ID="<KEY_ID>" -e AWS_SECRET_ACCESS_KEY="<ACCESS_KEY>" -p 9000:8080 authory/html-to-pdf-lambda
```

Invoking the container locally and storing the PDF:

```
curl -H "Content-Type: application/json" -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{ "body": " { \"html\": \"<h1>Test</h1>\", \"fileName\" : \"foobar\" }" }' | jq -r ".body"  | jq ".data"
```
