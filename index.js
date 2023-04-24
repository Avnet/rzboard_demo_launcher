const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const expressWs = require('express-ws')(app);
const DemoBase = require("./demobase");
const port = 8080;

global.__basedir = __dirname;

// Main web interface
app.use(express.static(`${global.__basedir}/public`))
app.use(express.static(`${global.__basedir}/node_modules`))

// Hold demos
let demos = [];
global.__demosDir = (process.argv.length === 2) ? __dirname + "/demos" : process.argv[2];

// Load demos
function loadDemos() {
    demos = [];

    // Probably not best way to dynamically load modules
    try {
        fs.readdirSync(global.__demosDir, {withFileTypes: true}).forEach((location) => {
            // Only look at directories
            if (location.isDirectory) {
                let demo = new DemoBase(app, global.__demosDir + "/" +location.name);
                demo.ws = expressWs.getWss('/');
                demos.push(demo);
            }
        });
    }
    catch {
        console.warn("Unable to load demos directory.");
    }
    
}

// Load demos
loadDemos();

// API Endpoint returns list of demos
app.get("/getDemoList", (req, res) => {
    let demoList = [];
    
    demos.forEach((demo) => {
        demoList.push(demo.config);
    })

    res.send(demoList);
});

// Reload demos list
app.get("/reloadDemoList", (req, res) => {
    loadDemos();

    let demoList = [];
    
    demos.forEach((demo) => {
        demoList.push(demo.config);
    })

    res.send(demoList);
});

app.ws('/', (ws, req) => {
});

// Start server
app.listen(port, () => {
    console.log(`Demo Web Interface listening on port ${port}`)
});