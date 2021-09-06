const puppeteer = require('puppeteer');
const HTML_TO_PDF_SERVICE_TOKEN = process.env.HTML_TO_PDF_SERVICE_TOKEN;

exports.handler = async (event, context, callback) => {

  if(HTML_TO_PDF_SERVICE_TOKEN) {
    const token = event.headers["Authorization"];
    if(!token.endsWidth(HTML_TO_PDF_SERVICE_TOKEN)) {
      return callback(new Error('auth token not valid'))
    }
  }

  if(event.body) {
    // API Gateway behavior.
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
    browser = await puppeteer.launch({
      // args: chromium.args,
      // defaultViewport: chromium.defaultViewport,
      // executablePath: await chromium.executablePath,
      args: ["--no-sandbox"],
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    const loaded = page.waitForNavigation({
      waitUntil: "load",
    });

    await page.setContent(event.html);
    await loaded;

    result = await page.pdf(options);
  } catch (error) {
    return callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return callback(null, {
    data: result.toString('base64')
  });
};