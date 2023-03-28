const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const expressWs = require('express-ws')(app);
const port = 8080;

// Main web interface
app.use(express.static('public'))
app.use(express.static('node_modules'))
// Hold demos
const demos = [];

// Probably not best way to dynamically load modules
fs.readdirSync(__dirname + "/demos").forEach((dir) => {
    var Demo = require("./demos/" + dir);
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
    console.log('Socket connected.');
});

// Start server
app.listen(port, () => {
    console.log(`Demo Web Interface listening on port ${port}`)
});