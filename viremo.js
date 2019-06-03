/* Package Dependencies */
const colors = require('colors');

// Local Dependencies
let browser = require('./app/browser');
let images = require('./app/images');
let filesystem = require('./app/filesystem');
let output = require('./app/output');

// runtime settings
let settings = require('./app/settings').default;
let websiteConfig = settings.default_config;
let config = null;

/** Process CLI Arguments */
process.argv.forEach(function (val, index, array) {
    if (val.match('-set-baseline')) {
        settings.baseline_mode = true;
    }
    if (val.match(/\-use\:.*/)) {
        websiteConfig = `./configs/${val.split(':')[1].trim()}`;
    }
});

/** Set the website configuration. */
try {
    config = require('./configs/default');
} catch (e) {
    console.log(`Error: Cannot find module '${websiteConfig}' :: ${e}`.red);
    return;
}

/** Run main application */
(async () => {

    /** Validate the config. */
    console.log('\nValidating Configuration...'.blue);
    let valid_config = browser.validate(config);
    if (!valid_config) {
        console.log("Invalid Website Configuration.".red);
        return;
    }

    /** Initialize the file system */
    console.log('\nInitializing filesystem...'.blue);
    let initialized = await filesystem.init(config, settings);
    if (!initialized) {
        console.log("Failed to initialize.".red);
        return;
    }

    /** Perform website crawl and capture */
    console.log(`\nCrawling and Capturing "${config.label}"...`.blue);
    let process = await browser.process(config, settings);

    /** Handle errors and warnings */
    if (process.errors.length) {
        for (error of process.errors) {
            console.log(`${error}`.red);
        }
        return;
    }
    if (process.warnings.length) {
        process.warnings.forEach((warning) => {
            console.log(`WARNING:\t${warning.message} [${warning.path}]`.yellow);
        });
    }

    /** Optimize generated images. */
    if (settings.baseline_mode) {
        await images.optimizeReferences(config.label, settings);
        return;
    } else {
        await images.optimizeCaptures(config.label, settings);
    }

    /** Compare captures to references */
    console.log('\nComparing Captures to References...'.blue);
    images.analyze(process.analysis, settings)
        .then(async (diffs) => {
            if (diffs.length) {
                console.log("Differences found. Generating review output.".yellow);
                let preparedDiffs = await output.prepareOutput(diffs, settings);
                if (preparedDiffs) {
                    let html = await output.generateHtml(preparedDiffs, config.label);
                    if (html) {
                        filesystem.saveOutput(html, config.label, settings);
                        console.log(`Output Generated ./output/results/${config.label}/output.html.`.yellow);
                    }
                }
            } else {
                console.log("No differences found.".green);
            }
        }).catch((err) => {
            console.log(`err`.red);
        });

})();
