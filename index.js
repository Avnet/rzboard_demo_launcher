const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const expressWs = require('express-ws')(app);
const port = 8080;

global.__basedir = __dirname;

// Main web interface
app.use(express.static(`${global.__basedir}/public`))
app.use(express.static(`${global.__basedir}/node_modules`))

// Hold demos
const demos = [];

global.__demosDir = (process.argv.length === 2) ? __dirname + "/demos" : process.argv[2];


// Probably not best way to dynamically load modules
fs.readdirSync(global.__demosDir).forEach((dir) => {
    var Demo = require(global.__demosDir + "/" + dir);
    let demo = new Demo(app);
    demo.ws = expressWs.getWss('/');
    demos.push(demo);
});

app.get("/getDemoList", (req, res) => {
    let demoList = [];
    
    demos.forEach((demo) => {
        demoList.push(demo.config);
    })

    res.send(demoList);
})

app.ws('/', (ws, req) => {
});

// Start server
app.listen(port, () => {
    console.log(`Demo Web Interface listening on port ${port}`)
});