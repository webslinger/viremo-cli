/**
 * Config Module
 * @module config
 */

class Path {
    /**
     * Instantiates Path object
     * @param {string} label
     * @param {string} path
     * @param {boolean} use_shell
     * @param {string[]} selectors
     * @param {Action[]} actions
     */
    constructor(label, path, use_shell, selectors, actions = []) {
        this.label = label;
        this.path = path;
        this.shell = use_shell;
        this.selectors = selectors;
        this.actions = actions;
    }
}

class Viewport {
    /**
     * Instantiates Viewport object
     * @param {string} label
     * @param {number} width
     * @param {number} height
     */
    constructor(label, width, height) {
        this.label = label;
        this.width = width;
        this.height = height;
    }
}

class Action {
    /**
     * Interaction Instructions
     * @param {string} event - "hover","focus","tap","click"
     * @param {string} label - "describe action"
     * @param {string} selector - css selector
     * @param {number} wait - delay after action
     */
    constructor(event, label, selector, wait = 200) {
        this.selector = selector;
        this.event = event;
        this.label = label;
        this.wait = wait;
    }
}

class Selector {
    constructor(selector) {
        this.value = selector
    }
}


class Config {
    /**
     * Instantiates Config object
     * @param {string} label
     * @param {string} url
     * @param {Viewport[]} viewports
     * @param {Path[]} paths
     * @param {string[]} shell - css selectors
     */
    constructor(label, url, viewports, paths, actions, shell) {
        this.label = label;
        this.url = url;
        this.viewports = viewports;
        this.paths = paths;
        this.actions = actions;
        this.shell = shell;

        /* Set IDs */
        for (let v = 0; v < this.viewports.length; v++) {
            this.viewports[v].id = v;
        }
        for (let p = 0; p < this.paths.length; p++) {
            this.paths[p].id = p;
        }
        for (let a = 0; a < this.actions.length; a++) {
            this.actions[a].id = a;
        }
        for (let s = 0; s < this.shell.length; s++) {
            this.shell[s].id = s;
        }
    }
}

/**
 * Returns new Viewport object.
 * @param {string} label
 * @param {number} width
 * @param {number} height
 * @returns {Viewport}
 */
exports.viewport = function (label, width, height) {
    return new Viewport(label,width,height);
};

/**
 * Returns new Path object.
 * @param {string} label
 * @param {string} path
 * @param {boolean|string} shell - true,false,{viewport label}
 * @param {string[]} selectors - css selectors
 * @param {Action[]} actions (optional)
 * @returns {Path}
 */
exports.path = function (label, path, use_shell, selectors, actions = []) {
    return new Path(label,path,use_shell,selectors,actions);
};

/**
 * Returns new Action object
 * @param {string} event - "hover","focus","tap","click"
 * @param {string} label - "describe action"
 * @param {string} selector - css selector
 * @param {number} wait - delay before capture (optional)
 */
exports.action = (event, label, selector, wait = 200) => {
    return new Action(event, label, selector, wait)
};

/**
 * Return custom configuration, all params required.
 * @param {string} label
 * @param {string} url
 * @param {Viewport[]} viewports
 * @param {Path[]} paths
 * @param {Action[]} actions
 * @param {string[]} shell
 * @returns {Config}
 */
exports.custom = function(label, url, viewports, paths, actions, shell) {
    return new Config(label, url, viewports, paths, actions, shell);
};

exports.default = new Config(
    "google", // label
    "https://about.google/", // url
    [
        // viewports (required 1+)
        new Viewport("desktop",1920,1080),
        new Viewport("mobile",375,812)
    ],
    [
        // paths (required 1+)
        new Path(
            "homepage",     // label
            "intl/en/",     // path
            true,           // capture shell elements
            [
                // page elements to capture css selectors
                new Selector(".home-hero-copy"),
                new Selector('#carousel-placeholder')
            ],
            [0]
        )
    ],
    [
        new Action(
            'hover',
            'hover carousel',
            '.carousel-placeholder'
        )
    ],
    [
        // site shell element css selectors (elements on all pages)
        new Selector("header"),
        new Selector("footer")
    ]
);
