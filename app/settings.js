/**
 * Settings Module
 * @module settings
 */

const path = require('path');


class Settings {
    /**
     * Instantiates Settings Object
     * @param {string} root - where to carry out filesystem operations from (optional)
     */
    constructor(root = null) {
        let app_dir = root || `${path.dirname(require.main.filename)}/`;
        let shots_dir = `${app_dir}output/captures/`;

        this.app_dir = `${app_dir}`;
        this.shots_dir = `${shots_dir}`;
        this.capture_dir = `${shots_dir}new/`;
        this.reference_dir = `${shots_dir}reference/`;
        this.output_dir = `${app_dir}output/results/`;
        this.baseline_mode = false;
        this.default_config = `./configs/default`;
        this.headless = true
    }
}

/**
 * Changes root of application filesystem operations
 * @param {string} root
 * @returns {Settings}
 */
exports.getLocalizedSettings = (root) => {
    return new Settings(root);
};

exports.default = new Settings();