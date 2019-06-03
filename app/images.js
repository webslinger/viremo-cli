/**
 * Images Module
 * @module images
 */

/* Package Dependences */
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const looksSame = require('looks-same');

/* Local Methods */
/**
 * Optimizes images in the given path.
 * @param {string} path
 * @returns {Promise<void>}
 */
let optimize = async (path) => {
    return await imagemin([path], {
        plugins: [
            imageminPngquant({
                strip: true,
                quality: [0.6,0.8]
            })
        ]
    });
};

let isEventCapture = (image) => {
    let eventCapture = false;
    let events = [
        "click","focus","tap","hover"
    ];
    for (let event of events) {
        if (image.match(`:${event}`)) {
            eventCapture = true;
        }
    }
    return eventCapture;
};

class Diff {
    /**
     * Instantiates Diff object
     * @param {TestCase} test_case
     * @param {string} full_path
     */
    constructor(test_case, full_path, obscured = false) {
        this.case = test_case;
        this.path = full_path;
        this.obscured = obscured;
    }
}


/**
 * Compares reference to new images to detect differences
 * @param {TestCase[]} analysis
 * @param {Settings} settings
 * @returns {Promise<Diff[]>}
 */
exports.analyze = (analysis, settings) => {
    return new Promise((resolve, reject) => {
        if ((!analysis || !analysis.length) || typeof analysis !== "object")
            reject(false);

        let diffs = [];
        let count = 0;

        for (let test_case of analysis) {
            let full_path = `${test_case.website}/${test_case.path}/${test_case.viewport}/${test_case.image}`;
            try {
                looksSame(`${settings.capture_dir}${full_path}`, `${settings.reference_dir}${full_path}`, function(error, {equal}) {
                    if (error)
                        throw error;

                    let result = {equal};
                    if (!result.equal) {
                        diffs.push(new Diff(test_case,full_path,isEventCapture(test_case.image)));
                    }
                    count++;
                    if (count === analysis.length) {
                        resolve(diffs);
                    }
                });
            } catch (e) {
                reject('An error occurred during comparison.' + `${e}`);
            }
        }

    });
};

/**
 * Optimizes reference images.
 * @param {string} website (label)
 * @param {Settings} settings
 * @returns {Promise<boolean>}
 */
exports.optimizeReferences = async (website, settings) => {
    try {
        let optimized = await optimize(`${settings.reference_dir}${website}/**/*.png`);
        return !!optimized.length;
    } catch (e) {
        return false;
    }
};

/**
 * Optimizes new images.
 * @param {string} website
 * @param {Settings} settings
 * @returns {Promise<boolean>}
 */
exports.optimizeCaptures = async (website, settings) => {
    try {
        let optimized = await optimize(`${settings.capture_dir}${website}/**/*.png`);
        return !!optimized.length;
    } catch (e) {
        return false;
    }
};