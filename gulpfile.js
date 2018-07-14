const gulp = require('gulp');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const printer = require('lighthouse/lighthouse-cli/printer');
const Reporter = require('lighthouse/lighthouse-core/report/report-generator');
const fs = require('fs-extra');
const config = require('./lighthouse-config.js');

async function write(file, report) {
    try {
        await fs.outputFile(file, report);
    } catch (e) {
        console.log("error while writing report ", e);
    }
}

async function launchChrome() {
    let chrome;
    try {
        chrome =  await chromeLauncher.launch({
          chromeFlags: [
            "--disable-gpu",
            "--no-sandbox",
            "--headless"
          ],
          enableExtensions: true,
          logLevel: "error"
        });
        console.log(chrome.port)
        return {
            port: chrome.port,
            chromeFlags: [
                "--headless"
            ],
            logLevel: "error"
         }
    } catch (e) {
        console.log("Error while launching Chrome ", e);
    }
}

async function lighthouseRunner(opt) {
    try {
        return await lighthouse("https://www.baidu.com", opt, config);
    } catch (e) {
        console.log("Error while running lighthouse");
    }
}

function genReport(result) {
    return Reporter.generateReport(result.lhr, 'html');
}

async function run(timestamp, num) {
    let chromeOpt = await launchChrome();
    let result = await lighthouseRunner(chromeOpt);
    let report = genReport(result);
    await printer.write(report, 'html', `./cases/lighthouse-report@${timestamp}-${num}.html`);
    return result.lhr.audits['first-meaningful-paint'].rawValue;
    await chrome.kill();
}

gulp.task('start', async function() {
  let timestamp = Date.now();
  let spent = [];
  for(let i=0; i<5; i++) {
      spent.push(await run(timestamp, i));
  }
  let template = await fs.readFileSync('./summary/template/template.html', 'utf-8');
  let summary = Reporter.replaceStrings(template, [{
      search: '%%TIME_SPENT%%',
      replacement: JSON.stringify(spent)
  }, {
      search: '%%TIMESTAMP%%',
      replacement: timestamp
  }]);
  write(`./summary/report/summary@${timestamp}.html`, summary)
})
