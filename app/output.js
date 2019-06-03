/**
 * Output Module
 * @module output
 */

/* Local Dependencies */
let filesystem = require('./filesystem');

class FullpageDiff {
    /**
     * Instantiates FullpageDiff object
     * @param path
     */
    constructor(path, obscured) {
        this.path = path;
        this.reference = `${path}fullpage_ref.png`;
        this.capture = `${path}fullpage.png`;
        this.obscured = obscured;
    }
}

/**
 * Prepares output directory and input data
 * @param {Diff[]} diffs
 * @param {Settings} settings
 * @returns {FullpageDiff[]}
 */
exports.prepareOutput = async (diffs, settings) => {

    let fullpageDiffs = [];
    let obscured = exports.hasObscuredCaptures(diffs);
    let paths = exports.extractDiffPaths(diffs);

    for (let path of paths) {
        await filesystem.copyToOutput(path, settings);
        fullpageDiffs.push(new FullpageDiff(path, obscured));
    }

    return fullpageDiffs;
};

/**
 * Prepares output page html
 * @param {Object[]} diffs
 * @param {string} website
 * @returns {Promise<string>}
 */
exports.generateHtml = async (diffs, website) => {

    let page_tmpl = filesystem.getTemplate('output');
    let switcher_tmpl = filesystem.getTemplate('snippets/switcher');
    let button_tmpl = '<button class="{activate}" data-target-id="{path}">{path}</button>';
    let title = `Test Output: ${new Date().toDateString()}`;
    let activate = "active";
    let obscureWarning = '';

    let tabs = "";
    for (let diff of diffs) {
        diff.path = diff.path.replace(`${website}/`,'');
        tabs += exports.render(button_tmpl, {
            path: diff.path,
            activate: activate
        });
        activate = "";
    }

    let switchers = "";
    for (let diff of diffs) {
        diff.reference = diff.reference.replace(`${website}/`,'');
        diff.capture = diff.capture.replace(`${website}/`,'');
        if (diff.obscured)
            obscureWarning = "Some diffs may not be visible due to trigger events. Review diffs in results folder.";
        switchers += exports.render(switcher_tmpl, {
            reference: diff.reference,
            new: diff.capture,
            path: diff.path,
            obscure_warning: obscureWarning
        });
        obscureWarning = '';
    }

    return exports.render(page_tmpl, {
        title: title,
        tabs:  tabs,
        switchers: switchers
    });
};

/**
 * Returns reorganized collection of diffs by path since we are using 1 fullpage shot for each path
 * @param {Diff[]} diffs
 * @returns {string[]}
 */
exports.extractDiffPaths = (diffs) => {

    let paths = [];
    for (let diff of diffs) {
        let path = diff.path;
        path = path.replace(diff.case.image,'');
        if (!paths.includes(path)) {
            paths.push(path);
        }
    }

    return paths;
};

/**
 * Checks for potentially obscured captures
 * @param diffs
 * @returns {boolean}
 */
exports.hasObscuredCaptures = (diffs) => {
    let hasObscured = false;
    for (let diff of diffs) {
        if (diff.obscured) {
            hasObscured = true;
        }
    }
    return hasObscured;
};

/**
 * Replaces template vars with values and returns html
 * @param {string} template
 * @param {Object} vars - any amount of key/value pairs as object
 * @returns {string}
 */
exports.render = (template, vars) => {

    let tmpl = template;
    let tmpl_vars = Object.entries(vars);

    for (let pair of tmpl_vars) {
        let variable = `{${pair[0]}}`;
        let regex = new RegExp(variable,"g");
        tmpl = tmpl.replace(regex,pair[1]);
    }

    return tmpl;
};