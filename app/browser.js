/**
 * Browser Module
 * @module browser
 */

/* Package Dependencies */
const puppeteer = require('puppeteer');
const colors = require('colors');

/* Local Dependencies */
const filesystem = require('./filesystem');

/* Local Methods & Properties */
function step(message) {
    if (log)
        console.log(`${message}`.blue);
    if (socket)
      socket(message);
}
function detail(message) {
    if (log)
        console.log(message);
    if (socket)
      socket(message);
}

let response = {
    warnings: [],
    errors: [],
    analysis: []
};
let log = true;
let socket = null;

class TestCase {
    constructor(website,path,viewport,image) {
        this.website = website;
        this.path = path;
        this.viewport = viewport;
        this.image = `${image}.png`;
    }
}

/**
 * Validates website configuration
 * @param {Config} website
 * @returns {boolean}
 */
exports.validate = (website) => {
    if (typeof website !== "object")
        return false;

    try {
        if (!website.url) return false;
        if (!website.label) return false;
        if (!website.shell) return false;
        if (!website.paths) return false;
        if (!website.paths.length) return false;
        if (!website.viewports) return false;
        if (!website.viewports.length) return false;
    } catch (e) {
        return false;
    }
    return true;
};

/**
 * Gets new page, sets dimensions, and returns page.
 * @param {Browser} browser
 * @param {Viewport} viewport
 * @returns {Promise<Page>}
 */
exports.newPage = async (browser, viewport) => {
    let page = await browser.newPage();
    await page.setViewport({
        width: viewport.width,
        height: viewport.height
    });
    return page;
};

/**
 * Navigates browser to given page and waits for network idle.
 * @param {string} path
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
exports.gotoPath = async (path, page) => {
    try {
        await page.goto(path, { waitUntil: 'networkidle0'});
    } catch (e) {
        response.errors.push(`Page Not Found: ${path}`);
        return false;
    }
    return true;
};

/**
 * Confirms that baseline images exist to compare to
 * @param {string} website (label)
 * @param {string} path (label)
 * @param {string} viewport (label)
 * @param {Settings} settings
 * @returns {boolean}
 */
exports.confirmBaselines = (website, path, viewport, settings) => {
    if (settings.baseline_mode)
        return true;

    if (filesystem.referenceExists(
        website,
        path,
        viewport,
        settings
    )) {
        return true;
    }
    if (response)
        response.errors.push(`Path ${path} has no reference images. Please re-establish baseline images.`);
    return false;
};

/**
 * Performs configured events
 * @param {Action[]} actions
 * @param {string} when
 * @param {Page} page
 * @param {string} website
 * @param {string} path
 * @param {string} viewport
 * @param {Settings} settings
 * @returns {boolean|Promise<Object>}
 */
exports.triggerActions = (path, actions, page) => {
  if (!path.actions.length) {
    return false;
  }

  return new Promise((resolve, reject) => {
    let count = 0;
    let response = {
      warnings: []
    }
    let waiting = false;
    for (let action_id of path.actions) {
      let current_action;
      for (let action of actions) {
        if (action.id === action_id) {
          current_action = action;
        }
      }
      if (current_action) {
        waiting = true;
        page[current_action.event](current_action.selector)
          .then(async () => {
            count++;
            if (count === actions.length) {
              if (response.warnings.length) {
                resolve(response);
              }
              resolve(true);
            }
          })
          .catch((err) => {
            count++;
            response.warnings.push(err);
            if (count === path.actions.length) {
              resolve(response);
            }
          })
      }
    }
    if (!waiting) {
      resolve(true);
    }
  });
};

/**
 * Selects and captures screen shot of provided css selector
 * @param {string} element (css selector)
 * @param {string} website (label)
 * @param {string} path (label)
 * @param {string} viewport (label)
 * @param {Settings} settings
 * @param {Page} page
 * @returns {Promise<boolean>|Object}
 */
exports.captureSelector = async (element, website, path, viewport, settings, page) => {
    let target_dir = (settings.baseline_mode) ? settings.reference_dir : settings.capture_dir;
    try {
        await page.waitForSelector(element, { timeout: 10000 });
        let selector = await page.$(element);
        let selectorFilename = element.replace(/\s/g,'_vSP_');
        selectorFilename = selectorFilename.replace('#','_vID_');
        selectorFilename = selectorFilename.replace('.','_vCLS_')
        await selector.screenshot({
            path: `${target_dir}${website}/${path}/${viewport}/${selectorFilename}.png`
        });
        if (response) {
            response.analysis.push(new TestCase(website,path,viewport,selectorFilename));
        }
        return true;
    } catch (e) {
        if (e.name === "TimeoutError") {
            response.warnings.push({
                message: `Selector "${element}" is null.`,
                path: `${viewport}: ${path}`
            });
            return response.warnings;
        } else {
            if (e.message.match("not visible")) {
                response.warnings.push({
                    message: `Selector "${element}" is likely not visible.`,
                    path: `${viewport}: ${path}`
                });
                return response.warnings;
            } else {
                response.errors.push(`${e}`);
                return response.errors;
            }
        }
    }
};

/**
 * Captures full page
 * @param {string} website
 * @param {string} path
 * @param {string} viewport
 * @param {Settings} settings
 * @param {Object} page
 * @returns {Promise<Buffer>|boolean}
 */
exports.captureFullpage = async (website, path, viewport, settings, page) => {
    try {
        let target_dir = (settings.baseline_mode) ? settings.reference_dir : settings.capture_dir;
        let selector = await page.$('body');
        let result = await selector.screenshot({
            path: `${target_dir}${website}/${path}/${viewport}/fullpage.png`
        });
        return result;
    } catch (e) {
        return false;
    }
};

/**
 * Crawl and Capture the Website
 * @param {Config} website
 * @param {Settings} settings
 * @param {boolean} output_logs (optional)
 * @returns {Object}
 */
exports.process = async (website, settings, output_logs = true, ui_socket = null) => {
    log = output_logs;
    socket = ui_socket;
    response = {
      warnings: [],
      errors: [],
      analysis: []
    };
    let browser = await puppeteer.launch({ignoreHTTPSErrors: true, headless: settings.headless});

    step(`Initializing Filesystem for ${website.label}`);
    await filesystem.init(website,settings);

    /** Runs for each viewport configured */
    viewportLoop:
        for (let viewport of website.viewports) {
            let page = await exports.newPage(browser, viewport);

            step(`\nAnalyzing ${website.label} [${viewport.label}]`);
            /** Check each page configured */
            for (let path of website.paths) {

                /** Confirm there are baseline images (if not in baseline mode) */
                if (exports.confirmBaselines(website.label, path.label, viewport.label, settings) === false)
                    break viewportLoop;

                /** Navigate to path */
                detail(` -| Opening ${website.url}${path.path}`);
                let navigation = await exports.gotoPath(`${website.url}${path.path}`, page);
                if (!navigation)
                    break viewportLoop;

                /** Capture pre-capture events */
                detail(`\t --| Checking for pre-screenshot events.`);
                await exports.triggerActions(path, website.actions, page);

                /** Select and capture shell elements */
                if (path.shell === true) {
                    detail("\t --| Capturing Shell Elements...");
                    for (let selector of website.shell) {
                        await exports.captureSelector(selector.value, website.label, path.label, viewport.label, settings, page);
                        if (response.errors.length)
                            break viewportLoop;
                    }
                }

                /** Select and capture page elements */
                if (path.selectors.length) {
                    detail("\t --| Capturing Page Elements...");
                    for (let selector of path.selectors) {
                        await exports.captureSelector(selector.value, website.label, path.label, viewport.label, settings, page);
                        if (response.errors.length)
                            break viewportLoop;
                    }
                }

                /** Capture fullpage */
                await exports.captureFullpage(website.label,path.label,viewport.label,settings,page);
            }
        }

    await browser.close();


    if (log && !response.errors.length)
        console.log("\nCapturing complete.\n".green);

    return response;
};