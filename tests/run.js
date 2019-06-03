const fs = require('fs-extra');
const assert = require('chai').assert;
const puppeteer = require('puppeteer');

let config = require('../app/config');

let settings = require('../app/settings').getLocalizedSettings(`${process.cwd()}/tests/`);

let websiteFactory = (overrides = {}) => {
    let defaultConfig = config.default;
    return config.custom(
        overrides.label || defaultConfig.label,
        overrides.url || defaultConfig.url,
        overrides.viewports || defaultConfig.viewports,
        overrides.paths || defaultConfig.paths,
        overrides.actions || defaultConfig.actions,
        overrides.shell || defaultConfig.shell
    );
};

describe('app/filesystem.js', function() {

    let filesystem = require('../app/filesystem');

    describe('init()', function() {
        it('Should should return error if there is an error', async () => {
            let result = await filesystem.init("wrench",settings);
            assert.strictEqual(typeof result === 'object',true);
        });
        it('Should return true if there is not a problem', async () => {
            let result = await filesystem.init(websiteFactory(),settings);
            assert.strictEqual(result,true);
        });
    });

    describe('emptyDirectory()', function() {
        it('Should remove all files from a directory', async () => {
            await filesystem.init(websiteFactory(),settings);
            await fs.writeFileSync(`${settings.reference_dir}google/homepage/desktop/test.txt`, "test", (err) => {
                console.log("Error.");
            });
            await filesystem.emptyDirectory(`${settings.reference_dir}google/homepage/desktop`);
            let files = await fs.readdirSync(`${settings.reference_dir}google/homepage/desktop`);
            assert.strictEqual(!!files.length,false);
        });
    });

    describe('referenceExists()', function() {
        it('Should return true if reference directory is not empty', async () => {
            let notEmpty = false;
            await filesystem.init(websiteFactory(),settings);
            await fs.writeFileSync(`${settings.reference_dir}google/homepage/desktop/test.txt`, "test", (err) => {
                console.log("Error.");
            });
            notEmpty = filesystem.referenceExists("google","homepage","desktop", settings);
            await filesystem.emptyDirectory(`${settings.reference_dir}google/homepage/desktop`);
            assert.strictEqual(notEmpty,true);
        });
        it('Should return false if reference directory is empty', async () => {
            await filesystem.init(websiteFactory(),settings);
            await filesystem.emptyDirectory(`${settings.reference_dir}google/homepage/desktop`);
            assert.strictEqual(
                filesystem.referenceExists("google","homepage","desktop", settings),
                false
            );
        });
    });

    describe('copyToOutput()', function() {
        it('Should return true after successfully copying images', async () => {
            await filesystem.init(websiteFactory(),settings);
            await fs.writeFileSync(`${settings.reference_dir}google/homepage/desktop/fullpage.png`, err => {
                console.log(err);
            });
            await fs.writeFileSync(`${settings.capture_dir}google/homepage/desktop/fullpage.png`, err => {
                console.log(err);
            });
            let result = await filesystem.copyToOutput('google/homepage/desktop/', settings);
            assert.strictEqual(result, true);
        });
        it('Should have copied fullpage.png from reference_dir to output_dir', async () => {
            assert.strictEqual(
                fs.existsSync(`${settings.output_dir}google/homepage/desktop/fullpage.png`),
                true
            );
        });
        it('Should have copied fullpage.png from capture_dir to output_dir', async () => {
            assert.strictEqual(
                fs.existsSync(`${settings.output_dir}google/homepage/desktop/fullpage.png`),
                true
            );
        });
        it('Should return false if captured or reference image is missing', async () => {
            await filesystem.emptyDirectory(`${settings.reference_dir}google/homepage/desktop`);
            let result = await filesystem.copyToOutput('google/homepage/desktop/',settings);
            assert.strictEqual(result,false);
        });
    });

    describe('getTemplate()', function() {
        it('Should return html as utf8 string from template.html file', async () => {
            await fs.writeFileSync(`${__dirname}/../output/templates/test.html`,'<html></html>', err => {
                console.log(err);
            });
            let html = await filesystem.getTemplate('test');
            await fs.unlink(`${__dirname}/../output/templates/test.html`);
            assert.strictEqual(html, "<html></html>");
        })
    });

    describe('saveOutput()', function() {
        it('Should save "output.html" to output_dir', async() => {
            try {
                await fs.unlink(`${settings.output_dir}output.html`);
            } catch (e) {}
            await filesystem.saveOutput("<html></html>", 'google', settings);
            let result = await fs.existsSync(`${settings.output_dir}google/output.html`);
            assert.strictEqual(result,true);
        })
    });
});

describe('app/browser.js', function () {

    let filesystem = require('../app/filesystem');
    this.timeout(60000);

    describe('validate()', function() {

        let browser = require('../app/browser');

        it('Should return false if no paths to test are specified',() => {
            assert.strictEqual(
                browser.validate(websiteFactory({paths:[]})),
                false
            );
        });
        it('Should return false if no viewports to test are specified',() => {
            assert.strictEqual(
                browser.validate(websiteFactory({viewports:[]})),
                false
            );
        });
        it('Should otherwise return true', () => {
            assert.strictEqual(
                browser.validate(websiteFactory()),
                true
            );
        });
    });

    describe('newPage()', function() {

        let browser = require('../app/browser');

        it('Should return instance of page', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await _browser.close();
            assert.strictEqual(
                page.__proto__.constructor.name,
                'Page'
            );
        });
    });

    describe('gotoPath()', function() {

        let browser = require('../app/browser');

        it('Should return false on bad response', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            let result = await browser.gotoPath('https://www.google.hijklmnop', page);
            await _browser.close();
            assert.strictEqual(result, false);
        });
        it('Should return true on good response', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            let result = await browser.gotoPath('https://www.google.com', page);
            await _browser.close();
            assert.strictEqual(result, true);
        });
    });

    describe('confirmBaselines()', function() {

        let browser = require('../app/browser');

        it('Should return true if in baseline_mode', () => {
            settings.baseline_mode = true;
            assert.strictEqual(
                browser.confirmBaselines('google','homepage','desktop',settings),
                true
            );
        });
        it('Should return true if reference directory is not empty', async () => {
            settings.baseline_mode = false;
            let notEmpty = false;
            fs.writeFileSync(`${settings.reference_dir}google/homepage/desktop/test.txt`, "test", (err) => {
                console.log("Error.");
            });
            notEmpty = browser.confirmBaselines('google','homepage','desktop',settings);
            await filesystem.emptyDirectory(`${settings.reference_dir}google/homepage/desktop`);
            assert.strictEqual(
                notEmpty,
                true
            );
        });
        it('Should return false if reference directory is empty', async () => {
            settings.baseline_mode = false;
            await filesystem.emptyDirectory(`${settings.reference_dir}google/homepage/desktop`);
            assert.strictEqual(
                browser.confirmBaselines('google','homepage','desktop',settings),
                false
            );
        });
    });

    describe('triggerActions()', function() {

        let browser = require('../app/browser');

        it('Should return false if no triggers are defined', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            let result = await browser.triggerActions({actions:[]},config.default.actions);
            await _browser.close();
            assert.strictEqual(
                result,
                false
            );
        });
        it('Should return true if no warnings were encountered', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.triggerActions({actions:[0]}, [{ id: 0, event: 'click',selector: '#main'}], page);
            await _browser.close();
            assert.strictEqual(
                result,
                true
            );
        });
        it('Should return warning if selector is null', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.triggerActions({actions:[0]}, [{id:0,event:'click',selector:'#facebook'}],page);
            await _browser.close();
            assert.notStrictEqual(
                result.warnings.length,
                true
            );
        });
    });

    describe('captureSelector()', function() {

        let browser = require('../app/browser');

        it('Should return true otherwise', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.captureSelector('#main', 'google','homepage','desktop',settings, page);
            await _browser.close();
            assert.strictEqual(
                result,
                true
            );
        });
        it('Should return warnings if selector is null', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.captureSelector('.smoochie', 'google','homepage','desktop',settings, page);
            await _browser.close();
            assert.notStrictEqual(
                result.length,
                true
            );
        });
        it('Should return warnings if selector is not visible', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.captureSelector('#gbw', 'google','homepage','desktop',settings, page);
            await _browser.close();
            assert.notStrictEqual(
                result.length,
                true
            );
        });
        it('Should return errors if there is an error', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.captureSelector('#main', 'google','homepage','desktop',settings, 'wrench');
            await _browser.close();
            assert.notStrictEqual(
                result.length,
                true
            );
        });
    });

    describe('captureFullpage()', function() {

        let browser = require('../app/browser');

        it('Should return Buffer when successful', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.captureFullpage('google','homepage','desktop',settings,page);
            settings.baseline_mode = true;
            await browser.captureFullpage('google','homepage','desktop',settings,page);
            settings.baseline_mode = false;
            await _browser.close();
            assert.strictEqual(
                result.__proto__.constructor.name,
                'Buffer'
            );
        });
        it('Should have created fullpage.png in capture_dir', async () => {
            let result = fs.existsSync(`${settings.capture_dir}google/homepage/desktop/fullpage.png`);
            assert.strictEqual(result, true);
        });
        it('Should have created fullpage.png in reference_dir', async () => {
            let result = fs.existsSync(`${settings.reference_dir}google/homepage/desktop/fullpage.png`);
            assert.strictEqual(result, true);
        });
        it('Should return false when unsuccessful', async () => {
            const _browser = await puppeteer.launch({ignoreHTTPSErrors: true});
            let page = await browser.newPage(_browser, config.viewport('test',1024,768));
            await browser.gotoPath('https://www.google.com',page);
            let result = await browser.captureFullpage('google','homepage','desktop',settings,'wrench');
            await _browser.close();
            assert.strictEqual(
                result,
                false
            );
        });
    });

    describe('process()', function() {

        let browser = require('../app/browser');

        it('Should return response object when complete (baseline mode)', async () => {
            settings.baseline_mode = true;
            await filesystem.emptyDirectory(settings.reference_dir);
            await filesystem.emptyDirectory(settings.capture_dir);
            let result = await browser.process(websiteFactory(),settings,false);
            assert.notStrictEqual(
                result.warnings && (result.errors && !result.errors.length) && result.analysis,
                true
            );
        });
        it('Should return response object when complete (normal mode)', async () => {
            settings.baseline_mode = false;
            await filesystem.emptyDirectory(settings.capture_dir);
            let result = await browser.process(websiteFactory(),settings,false);
            assert.notStrictEqual(
                result.warnings && result.errors && result.analysis,
                true
            );
        });
    });

});

describe('app/images.js', function() {

    let images = require('../app/images');
    const sharp = require('sharp');

    this.timeout(60000);

    describe('optimizeReferences()', function() {
        it('Should return false if there is an error', async () => {
            let result = await images.optimizeReferences('google');
            assert.strictEqual(result,false);
        });
        it('Should return true otherwise', async () => {
            let result = await images.optimizeReferences('google', settings);
        })
    });

    describe('optimizeCaptures()', function() {
        it('Should return false if there is an error', async () => {
            let result = await images.optimizeCaptures('google', 'wrench');
            assert.strictEqual(result,false);
        });
        it('Should return true otherwise', async () => {
            let result = await images.optimizeCaptures('google', settings);
        })
    });

    describe('analyze()', function() {
        it('Should return an error if an error is encountered', (done) => {
            images.analyze([{
                website: "google",
                path: "homepage",
                viewport: "desktop",
                image: "header.png"
            }])
                .then(diffs => {
                    assert.strictEqual(true, false);
                    done();
                })
                .catch(err => {
                    assert.strictEqual(true,true);
                    done();
                });
        });
        it('Should return empty array if no diffs are found', (done) => {
            images.analyze([{
                website: "google",
                path: "homepage",
                viewport: "desktop",
                image: "header.png"
            }], settings)
                .then(diffs => {
                    assert.strictEqual(!!diffs.length, false);
                    done();
                })
                .catch(err => {
                    assert.strictEqual(false, true);
                });
        });
        it('Should return an array of diffs when differences are found', (done) => {

            let count = 0;
            let compareImages = () => {
                if (count === 2) {
                    images.analyze([{
                        website: "google",
                        path: "homepage",
                        viewport: "desktop",
                        image: "header_test.png"
                    }], settings)
                        .then((result) => {
                            assert.strictEqual(!!result.length, true);
                            fs.unlink(`${settings.capture_dir}google/homepage/desktop/header_test.png`);
                            fs.unlink(`${settings.reference_dir}google/homepage/desktop/header_test.png`);
                            done();
                        })
                }
            };

            sharp(`${settings.capture_dir}google/homepage/desktop/header.png`)
                .negate()
                .toFile(`${settings.capture_dir}google/homepage/desktop/header_test.png`, async (err,info) => {
                    count++;
                    compareImages();
                });

            sharp(`${settings.reference_dir}google/homepage/desktop/header.png`)
                .toFile(`${settings.reference_dir}google/homepage/desktop/header_test.png`, async (err,info) => {
                    count++;
                    compareImages();
                });
        });
    });
});

describe('app/output.js', function() {

    let output = require('../app/output');

    describe('extractDiffPaths()', function() {
        it('Should return array of strings', () => {
            let result = output.extractDiffPaths([
                {
                    case: {
                        website: 'google',
                        path: 'homepage',
                        viewport: 'desktop',
                        image: 'header.png'
                    },
                    path: 'google/homepage/desktop/header.png'
                }
            ]);
            if (result.length) {
                assert.strictEqual(
                    result[0],
                    'google/homepage/desktop/'
                );
            } else {
                assert.strictEqual(true,false);
            }
        })
    });

    describe('prepareOutput()', function() {
        it('Should return an array of FullpageDiffs', async () => {
            let result = await output.prepareOutput(
                [{
                    case: {
                        website: 'google',
                        path: 'homepage',
                        viewport: 'desktop',
                        image: 'header.png'
                    },
                    path: 'google/homepage/desktop/header.png'
                }], settings
            );
            if (result.length) {
                assert.deepEqual(
                    result[0].__proto__.constructor.name,
                    'FullpageDiff'
                );
            } else {
                assert.strictEqual(true,false);
            }
        });
    });

    describe('render()', function() {
       it('Should return template with vars replaced', () => {
           let template = "<div>{test}{test2}{test3}</div>";
           let result = output.render(template, {
               test: "A",
               test2: "B",
               test3: "C"
           });
           assert.strictEqual(
               result,
               "<div>ABC</div>"
           );
       })
    });

    describe('generateHtml()', function() {
        it('Should return html string', async () => {
            let result = await output.generateHtml([{
                path: 'google/homepage/desktop/',
                reference: 'google/homepage/desktop/fullpage_ref.png',
                capture: 'google/homepage/desktop/fullpage.png'
            }], 'google');
            assert.strictEqual(
                typeof result,
                'string'
            );
        })
    })

});