/*
 Live.js - One script closer to Designing in the Browser
 Written for Handcraft.com by Martin Kool (@mrtnkl).

 Updated by Ross Wintle (https://rw.omg.lol) to:
  - Use EventSource for server-sent events
  - Use async/await
  - Use fetch instead of XMLHttpRequest for requests
  - Be a JS class
  - Use a hash of the HTML to check for content changes
  - Use manually configured monitors (specify JS, CSS, HTML in the constructor)
  - Update the CSS change detection to actually work with modern browsers

 Comments from the original Live.js:

 Version 4.
 Recent change: Made stylesheet and mimetype checks case insensitive.

 http://livejs.com
 http://livejs.com/license (MIT)
 @livejs

 Include live.js#css to monitor css changes only.
 Include live.js#js to monitor js changes only.
 Include live.js#html to monitor html changes only.
 Mix and match to monitor a preferred combination such as live.js#html,css

 By default, just include live.js to monitor all css, js and html changes.

 Live.js can also be loaded as a bookmarklet. It is best to only use it for CSS then,
 as a page reload due to a change in html or css would not re-include the bookmarklet.
 To monitor CSS and be notified that it has loaded, include it as: live.js#css,notify
*/
class Live {

    constructor() {
        /**
         * The URL of the watch script's server
         *
         * @type {string}
         */
        this.monitorUrl = 'http://localhost:8008';

        /**
         * Set up the EventSource object
         *
         * @type {EventSource}
         */
        this.eventSrc = new EventSource(this.monitorUrl);
        this.eventSrc.addEventListener('buildComplete', (event) => this.heartbeat());

        /**
         * The headers to check for changes
         *
         * @type {Array<string>}
         */
        this.headers = [ "Etag", "Last-Modified", "Content-Length", "Content-Type" ];

        /**
         * The list of resource to monitor
         *
         * @type {object}
         */
        this.resources = {};

        /**
         * The hash of the current page's HTML
         *
         * @type {number|boolean}
         */
        this.htmlHash = false;

        /**
         * The list of pending requests
         *
         * @type {object}
         */
        this.pendingRequests = {};

        /**
         * The list of current link elements for CSS files
         *
         * @type {object}
         */
        this.currentLinkElements = {};

        /**
         * The list of old link elements for CSS files
         *
         * @type {object}
         */
        this.oldLinkElements = {};

        /**
         * The script's loaded state
         *
         * @type {boolean}
         */
        this.loaded = false;

        /**
         * Which monitors are active
         *
         * @type {object}
         */
        this.active = { "html": 1, "css": 1, "js": 1 };
    }

    /**
     * The main checking function that runs when an event is received to say that
     * something has changed.
     */
    async heartbeat() {
        if (document.body) {
            // make sure all resources are loaded on first activation
            if (!this.loaded) {
                await this.loadresources();
            }
            await this.checkForChanges();
        }
    }

    /**
     * Helper method to assert if a given url is local
     *
     * @param {string} url
     * @return {boolean}
     */
    isLocal(url) {
        const loc = document.location;
        const urlObject = new URL(url, loc.href);
        return urlObject.origin === loc.origin;
    }

    /**
     * Loads all local css and js resources upon first activation
     */
    async loadresources() {
        let uris = [];

        // Set the HTML hash if we're tracking HTML
        if (this.active.html) {
            this.htmlHash = await this.getCurrentPageHash();
        }

        // Track local JS URLs
        if (this.active.js) {
            const scripts = this.getLocalScriptUris();
            uris.push(...scripts)
        }

        // Track local CSS URLs
        if (this.active.css) {
            const cssLinks = this.getLocalCssUris();
            uris.push(...cssLinks)
        }

        // Initialize the resources info
        uris.forEach(
            ( async url => {
                const info = await this.getHead(url);
                this.resources[url] = info;
            } ).bind(this)
        )

        // Add styles for morphing between old and new css files
        const head = document.getElementsByTagName("head")[0];
        const style = document.createElement("style");
        const rule = "transition: all .3s ease-out;";
        const css = `.livejs-loading * { ${rule} }`;
        style.setAttribute("type", "text/css");
        head.appendChild(style);
        style.appendChild(document.createTextNode(css));

        // We are loaded!
        this.loaded = true;
    }

    /**
     * Returns an array of uri's for all local scripts
     *
     * @returns {Array<string>}
     */
    getLocalScriptUris() {
        const uris = [];
        const scripts = document.getElementsByTagName("script");

        Array.from(scripts).forEach(script => {
            const src = script.getAttribute("src");

            if (src && this.isLocal(src)) {
                uris.push(src);
            }
        })

        return uris;
    }

    /**
     * Returns an array of uri's for all local css files
     *
     * @returns {Array<string>}
     */
    getLocalCssUris() {
        const uris = [];
        const links = document.getElementsByTagName("link");

        Array.from(links).forEach(link => {
            const rel = link.getAttribute("rel");
            const href = link.getAttribute("href");

            if (href && rel && rel.match(new RegExp("stylesheet", "i")) && this.isLocal(href)) {
                uris.push(href);
                // TODO: What is this for?
                this.currentLinkElements[href] = link;
            }
        } )

        return uris;
    }


    /**
     * Checks all tracking resources for changes
     */
    async checkForChanges() {
        // Get the new content hash and reload if it has changed
        if (this.active.html) {
            const newHash = await this.getCurrentPageHash();
            if (newHash !== this.htmlHash) {
                document.location.reload();
            }
        }

        // Iterate over all resources and check for changes
        Object.keys(this.resources).forEach(async (url) => {
            await this.checkResourceForChanges(url);
        })
    }

    /**
     * Checks a resource for changes
     *
     * @param {string} url
     */
    async checkResourceForChanges(url) {
        if (this.pendingRequests[url]) {
            return;
        }

        let newInfo = await this.getHead(url);
        let oldInfo = this.resources[url];

        let contentType = newInfo["Content-Type"];

        let hasChanged = false;
        this.resources[url] = newInfo;

        for (var header in oldInfo) {
            // Do verification based on the header type
            let oldHeaderValue = oldInfo[header];
            let newHeaderValue = newInfo[header];

            if (header.toLowerCase() === "etag" && !newHeaderValue) {
                continue;
            }

            if (oldHeaderValue != newHeaderValue) {
                hasChanged = true;
                break;
            }
        }

        // If changed, act
        if (hasChanged) {
            this.refreshResource(url, contentType);
        }
    }

    /**
     * Act upon a changed url of certain content type
     *
     * @param {*} url
     * @param {*} resourceType
     * @returns
     */
    refreshResource(url, resourceType) {
        switch (resourceType.toLowerCase()) {
            // CSS files can be reloaded dynamically by replacing the link element
            case "text/css":
                // debugger;
                let link = this.currentLinkElements[url];
                let html = document.documentElement;
                let head = link.parentNode;
                let newLink = document.createElement("link");

                html.className = html.className.replace(/\s*livejs\-loading/gi, '') + ' livejs-loading';
                newLink.type = 'text/css';
                newLink.rel = 'stylesheet';
                newLink.href = url + "?now=" + (new Date().getTime());

                link.after(newLink);
                this.currentLinkElements[url] = newLink;
                this.oldLinkElements[url] = link;

                // schedule removal of the old link
                this.removeOldLinkElements();
                break;

            // check if an html resource is our current url, then reload
            case "text/html":
                if (url != document.location.href) {
                    return;
                }

            // local javascript changes cause a reload as well
            case "text/javascript":
            case "application/javascript":
            case "application/x-javascript":
                document.location.reload();
        }
    }

    /**
     * Removes the old stylesheet rules only once the new one has finished loading.
     *
     * The delayed retrys on deleting links are to allow the transition animation to happen
     * when the new sheet loads. It waits until the new stylesheet is loaded before
     * deleting the old one. There is no event that tells us when a stylesheet is loaded!
     */
    removeOldLinkElements() {
        // debugger;
        let pending = 0;
        for (var url in this.oldLinkElements) {
            // Check if the new links has finished loading
            const link = this.currentLinkElements[url];
            if (!link.sheet) {
                pending++;
                continue;
            }

            // The new link has finished loading. We can delete the old link now.
            const oldLink = this.oldLinkElements[url];
            const html = document.documentElement;

            oldLink.remove();
            delete this.oldLinkElements[url];
            // Wait for animations to complete. This is a guess/hack.
            setTimeout(function () {
                html.className = html.className.replace(/\s*livejs\-loading/gi, '');
            }, 100);
        }
        // Retry if the new sheets weren't all loaded.
        if (pending) {
            setTimeout(this.removeOldLinkElements.bind(this), 50);
        };
    }

    /**
     * Loads the current page and returns a hash of the content
     *
     * @returns {Promise<number|boolean>}
     */
    async getCurrentPageHash() {
        const html = await this.getNewHtml();

        if (!html) {
            return false;
        }

        return this.hashCode(html);
    }

    /**
     * Fetches up to date HTML for the current page
     *
     * @returns {Promise<string|boolean>}
     */
    async getNewHtml() {
        try {
            const response = await fetch(document.location.href, { method: 'GET' });
            if (response.ok) {
                return await response.text();
            }
        } catch (error) {
            console.error('Error:', error);
        }
        return false;
    }

    /**
     * Performs a HEAD request and returns the header info
     *
     * @param {string} url
     * @return {Promise<object>}
     */
    async getHead(url) {
        let response;
        this.pendingRequests[url] = true;

        try {
            response = await fetch(url, { method: 'HEAD' });
        } catch (error) {
            console.error(`Fetch Error: ${error}`);
            return {};
        }

        if (!response.ok) throw new Error('Network response was not ok');

        let headerInfo = {};

        // Process the headers that we want to check
        this.headers.forEach((header) => {
            let value = response.headers.get(header);
            if (header.toLowerCase() === "etag" && value) {
                value = value.replace(/^W\//, '');
            }
            if (header.toLowerCase() === "content-type" && value) {
                value = value.replace(/^(.*?);.*?$/i, "$1");
            }

            headerInfo[header] = value;
        })

        delete this.pendingRequests[url];

        return headerInfo;
    }

    /*
     * Generates a simple hash of the string
     *
     * @param {string} str
     * @return {number}
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0, len = str.length; i < len; i++) {
            let chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

}


if (document.location.protocol != "file:") {
    if (!window.liveJsLoaded) {
        var LiveJs = new Live();
        LiveJs.heartbeat();
        window.liveJsLoaded = true;
    }
} else {
    console.log("Live.js doesn't support the file protocol. It needs http.");
}
