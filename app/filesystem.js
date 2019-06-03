/**
 * File System Module
 * @module filesystem
 */ 

/* Package Dependencies */
const fs = require('fs-extra');
const path = require('path');


/**
 * Geneerates support folders for website configuration
 * @param {Config} config
 * @param {Settings} settings
 * @returns {boolean}
 */
exports.init = async (config, settings) => { 
    try {
        if (!fs.existsSync(`${settings.app_dir}output`)) {
            fs.mkdirSync(`${settings.app_dir}output`);
        }
        
        if (!fs.existsSync(settings.shots_dir)) {
            fs.mkdirSync(settings.shots_dir);
        }

        if (fs.existsSync(settings.capture_dir)) {
            await fs.emptyDir(settings.capture_dir);
        } else {
            fs.mkdirSync(settings.capture_dir);
        }

        if (!fs.existsSync(settings.output_dir)) {
            await fs.mkdirSync(settings.output_dir);
        }

        if (!fs.existsSync(`${settings.capture_dir}${config.label}`)) {
            fs.mkdirSync(`${settings.capture_dir}${config.label}`);
        }

        for (let path of config.paths) {
            if (!fs.existsSync(`${settings.capture_dir}${config.label}/${path.label}`)) {
                fs.mkdirSync(`${settings.capture_dir}${config.label}/${path.label}`);
                for (let viewport of config.viewports) {
                    if (!fs.existsSync(`${settings.capture_dir}${config.label}/${path.label}/${viewport.label}`)) {
                        fs.mkdirSync(`${settings.capture_dir}${config.label}/${path.label}/${viewport.label}`);
                    } else {
                        await fs.emptyDir(`${settings.capture_dir}${config.label}/${path.label}/${viewport.label}`);
                    }
                }
            }
        }

        if (!fs.existsSync(settings.reference_dir)) {
            fs.mkdirSync(settings.reference_dir);
        } else {
            if (settings.baseline_mode) {
                await fs.emptyDir(settings.reference_dir);
            }
        }

        if (!fs.existsSync(`${settings.reference_dir}${config.label}`)) {
            fs.mkdirSync(`${settings.reference_dir}${config.label}`);
        }

        for (let path of config.paths) {
            if (!fs.existsSync(`${settings.reference_dir}${config.label}/${path.label}`)) {
                fs.mkdirSync(`${settings.reference_dir}${config.label}/${path.label}`);
                for (let viewport of config.viewports) {
                    if (!fs.existsSync(`${settings.reference_dir}${config.label}/${path.label}/${viewport.label}`)) {
                        fs.mkdirSync(`${settings.reference_dir}${config.label}/${path.label}/${viewport.label}`);
                    } else {
                       await fs.emptyDir(`${settings.reference_dir}${config.label}/${path.label}/${viewport.label}`);
                    }
                }
            }
        }

    } catch (e) {
        return e;
    }
    return true;
};

/**
 * Checks if reference images exist
 * @param {string} website (label)
 * @param {string} path (label)
 * @param {string} viewport (label)
 * @param {Settings} settings
 * @returns {boolean}
 */
exports.referenceExists = (website, path, viewport, settings) => {
    let reference_files = fs.readdirSync(`${settings.reference_dir}${website}/${path}/${viewport}`);
    return !!reference_files.length;
};

/**
 * Copies fullpage captures to output directory
 * @param {string} path
 * @param {Settings} settings
 * @returns {Promise<boolean>}
 */
exports.copyToOutput = async (path, settings) => {
    let reference = `${settings.reference_dir}${path}fullpage.png`;
    let capture = `${settings.capture_dir}${path}fullpage.png`;

    try {
        await fs.copy(reference, `${settings.output_dir}${path}fullpage_ref.png`);
        await fs.copy(capture, `${settings.output_dir}${path}fullpage.png`);
    } catch (e) {
        return false;
    }

    if (!fs.existsSync(`${settings.output_dir}${path}fullpage.png`))
        return false;
    else if (!fs.existsSync(`${settings.output_dir}${path}fullpage_ref.png`))
        return false;
    return true;
};

/**
 * Empties a directory
 * @param {string} dir
 * @returns {Promise<void>}
 */
exports.emptyDirectory = async (dir) => {
    await fs.emptyDir(dir);
};

/**
 * Returns utf8 string of template
 * @param {string} template
 * @param {Settings} settings
 * @returns {string}
 */
exports.getTemplate = (template) => {
    return fs.readFileSync(`${__dirname}/../output/templates/${template}.html`, 'utf8');
};

/**
 * Writes html file to output directory
 * @param {string} response
 * @param {string} website
 * @param {Settings} settings
 */
exports.saveOutput = (response, website, settings) => {
    fs.writeFileSync(`${settings.output_dir}${website}/output.html`, response, (err) => {
        if (err) throw err;
    });
};