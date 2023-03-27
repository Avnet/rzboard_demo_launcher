const express = require('express')
const fs = require('fs');
const path = require('path');

class DemoBase {

    // Constructor
    constructor(app, dirname) {
        // Module path
        this.durname = dirname;
        this.basename = path.basename(dirname)
        
        // Setup static path for web interface
        app.use(`/${this.basename}`, express.static(`./demos/${this.basename}/public`))

        console.log(`./demos/${this.basename}/public`)
    }
}

module.exports = DemoBase