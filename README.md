# html-to-pdf-lambda

Small lambda to convert HTML pages into PDFs.

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

## Building the image

```
docker build -t authory/html-to-pdf-lambda .
```

## Running locally

To run locally, use aws-lambda-rie, as [outlined here](https://github.com/aws/aws-lambda-nodejs-runtime-interface-client#local-testing): 

```
sudo docker run  -v .aws-lambda-rie:/aws-lambda -p 9000:8080 \
  --entrypoint /aws-lambda/aws-lambda-rie authory/html-to-pdf-lambda \
  /usr/local/bin/npx aws-lambda-ric app.handler
```

```
mkdir -p .aws-lambda-rie && \
    curl -Lo .aws-lambda-rie/aws-lambda-rie https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie && \
    chmod +x ~/.aws-lambda-rie/aws-lambda-rie
```

```
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{ "html": "<h1>Hello</h1>"}'
```