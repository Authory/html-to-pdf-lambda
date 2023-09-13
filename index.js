const chromium = require('chrome-aws-lambda');
const AWS = require('aws-sdk');
const sizeOf = require('buffer-image-size');
const HTML_TO_PDF_SERVICE_TOKEN = process.env.HTML_TO_PDF_SERVICE_TOKEN;
const PDF_BUCKET_NAME = process.env.PDF_BUCKET_NAME;
const PDF_BUCKET_DOMAIN = process.env.PDF_BUCKET_DOMAIN;

exports.handler = async (event, context, callback) => {

  if (HTML_TO_PDF_SERVICE_TOKEN) {
    const token = event.headers["authorization"] || event.headers["Authorization"];
    if (!token || !token.endsWith(HTML_TO_PDF_SERVICE_TOKEN)) {
      return callback(null, {
        statusCode: 403,
        body: "Authorization Required.",
        headers: {},
        isBase64Encoded: false
      });
    }
  }

  if (event.body) {
    // Parse body from API gateway.
    event = JSON.parse(event.body)
  }

  let result = null;
  let browser = null;
  let fileName = null;
  let dimensions = undefined;

  let options = {
    format: event.format || "A4",
    printBackground: event.format || false,
    margin: event.margin || {
      top: "1in",
      right: "1in",
      bottom: "1in",
      left: "1in"
    },
  }

  console.log("=====EVENT", event);

  if (!event.html && !event.url) {
    return callback(new Error('html or url is a required parameter'))
  }

  if (!event.fileName) {
    return callback(new Error('fileName is a required parameter'))
  }

  try {

    console.log('Starting browser.')

    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      headless: true,
      executablePath: await chromium.executablePath,
      ignoreHTTPSErrors: true,
    });

    browser.on('')

    console.log('Opening page.')

    const page = await browser.newPage();

    if (event.viewportWidth && event.viewportHeight) {
      await page.setViewport({
        width: parseInt(event.viewportWidth),
        height: parseInt(event.viewportHeight),
        deviceScaleFactor: 2
      });
    }

    const loaded = page.waitForNavigation({
      waitUntil: "load",
    });

    console.log('Loading content.')

    if (event.html) {
      await page.setContent(event.html);
    } else if (event.url) {
      await page.goto(event.url)
    }

    await loaded;

    if (event.renderScreenshot) {
      console.log('Rendering screenshot.')

      result = await page.screenshot({
        "type": "png", // can also be "jpeg" or "webp" (recommended)
        "fullPage": true,  // will scroll down to capture everything if true
      });

      dimensions = sizeOf(result);

    } else {
      console.log('Rendering PDF.')
      result = await page.pdf(options);
    }

    const s3 = new AWS.S3();

    fileName = `${(Math.random() + 1).toString(36).substring(2)}/${event.fileName}.${event.renderScreenshot ? "png" : "pdf"}`;

    console.log(`Uploading to s3 bucket ${PDF_BUCKET_NAME} as ${fileName}`);

    const uploadRes = await new Promise((resolve, reject) =>
      s3.putObject({
        Bucket: PDF_BUCKET_NAME,
        Key: fileName,
        ContentType: event.renderScreenshot ? "image/png" : "application/pdf",
        Body: result,
        ACL: 'public-read'
      },
        (error, data) => {
          if (error) {
            console.log('Upload failed', error);
            reject(error)
          } else {
            console.log('Upload complete');
            resolve(data)
          }
        })
    )

    console.log("uploadRes", uploadRes);

    if (browser !== null) {
      console.log('Closing Browser.')
      await browser.close();
      browser = null
    }

  } catch (error) {

    if (browser !== null) {
      console.log('Closing Browser.')
      await browser.close();
      browser = null
    }

    console.log('Invoking error callback..')
    return callback(error);
  }

  console.log('Returning result.')

  // Compose body for API Gateway.
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-integration-settings-integration-response.html
  return callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      data: `${PDF_BUCKET_DOMAIN}/${fileName}`,
      dimensions
    }),
    headers: {
      "Content-Type": "application/json"
    },
    isBase64Encoded: false
  });
};