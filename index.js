const express = require('express')
const fs = require('fs');
const app = express()
const port = 8080

// Main web interface
app.use(express.static('public'))

// Hold demos
const demos = [];

// Probably not best way to dynamically load modules
fs.readdirSync(__dirname + "/demos").forEach((dir) => {
    var Demo = require("./demos/" + dir);
    demos.push(new Demo(app));
});

// Start server
app.listen(port, () => {
    console.log(`Demo Web Interface listening on port ${port}`)
});