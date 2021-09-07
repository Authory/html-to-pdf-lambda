const puppeteer = require('puppeteer');
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

  // Settings from: https://github.com/alixaxel/chrome-aws-lambda/blob/master/source/index.ts
  const chromiumArgs = [
    '--allow-running-insecure-content', // https://source.chromium.org/search?q=lang:cpp+symbol:kAllowRunningInsecureContent&ss=chromium
    '--autoplay-policy=user-gesture-required', // https://source.chromium.org/search?q=lang:cpp+symbol:kAutoplayPolicy&ss=chromium
    '--disable-component-update', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableComponentUpdate&ss=chromium
    '--disable-domain-reliability', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableDomainReliability&ss=chromium
    '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process', // https://source.chromium.org/search?q=file:content_features.cc&ss=chromium
    '--disable-print-preview', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisablePrintPreview&ss=chromium
    '--disable-setuid-sandbox', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSetuidSandbox&ss=chromium
    '--disable-site-isolation-trials', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSiteIsolation&ss=chromium
    '--disable-speech-api', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSpeechAPI&ss=chromium
    '--disable-web-security', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableWebSecurity&ss=chromium
    '--disk-cache-size=33554432', // https://source.chromium.org/search?q=lang:cpp+symbol:kDiskCacheSize&ss=chromium
    '--enable-features=SharedArrayBuffer', // https://source.chromium.org/search?q=file:content_features.cc&ss=chromium
    '--hide-scrollbars', // https://source.chromium.org/search?q=lang:cpp+symbol:kHideScrollbars&ss=chromium
    '--ignore-gpu-blocklist', // https://source.chromium.org/search?q=lang:cpp+symbol:kIgnoreGpuBlocklist&ss=chromium
    '--in-process-gpu', // https://source.chromium.org/search?q=lang:cpp+symbol:kInProcessGPU&ss=chromium
    '--mute-audio', // https://source.chromium.org/search?q=lang:cpp+symbol:kMuteAudio&ss=chromium
    '--no-default-browser-check', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoDefaultBrowserCheck&ss=chromium
    '--no-pings', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoPings&ss=chromium
    '--no-sandbox', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoSandbox&ss=chromium
    '--no-zygote', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoZygote&ss=chromium
    '--use-gl=swiftshader', // https://source.chromium.org/search?q=lang:cpp+symbol:kUseGl&ss=chromium
    '--window-size=1920,1080', // https://source.chromium.org/search?q=lang:cpp+symbol:kWindowSize&ss=chromium
  ]

  chromiumArgs.push('--single-process')
  
  try {

    console.log('Starting browser.')

    browser = await puppeteer.launch({
      args: chromiumArgs,
      headless: true,
      defaultViewport: {
        deviceScaleFactor: 1,
        hasTouch: false,
        height: 1080,
        isLandscape: true,
        isMobile: false,
        width: 1920,
      },
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