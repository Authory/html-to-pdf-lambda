const chromium = require('chrome-aws-lambda');
const HTML_TO_PDF_SERVICE_TOKEN = process.env.HTML_TO_PDF_SERVICE_TOKEN;

exports.handler = async (event, context, callback) => {

  if(HTML_TO_PDF_SERVICE_TOKEN) {
    const token = event.headers["authorization"] || event.headers["Authorization"];
    if(!token || !token.endsWith(HTML_TO_PDF_SERVICE_TOKEN)) {
      return callback(null, {
        statusCode: 403,
        body: "Authorization Required.",
        headers: { },
        isBase64Encoded: false
      });
    }
  }

  if(event.body) {
    // Parse body from API gateway.
    event = JSON.parse(event.body)
  }

  let result = null;
  let browser = null;

  let options = {
    format: event.format || "A4",
    printBackground: event.format || false,
    margin: event.margin || { top: "1in", 
      right: "1in", 
      bottom: "1in",
      left: "1in"
    },
  }

  if(!event.html) {
    return callback(new Error('html is a required parameter'))
  }

  
  try {

    console.log('Starting browser.')

    browser =  await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      headless: true,
      executablePath: await chromium.executablePath,
      ignoreHTTPSErrors: true,
    });

    browser.on('')

    console.log('Opening page.')

    const page = await browser.newPage();

    const loaded = page.waitForNavigation({
      waitUntil: "load",
    });

    console.log('Loading content.')

    await page.setContent(event.html);
    await loaded;

    console.log('Rendering PDF.')

    result = await page.pdf(options);

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
      data: result.toString('base64')
    }),
    headers: {
      "Content-Type": "application/json"
    },
    isBase64Encoded: false
  });
};