const express = require('express')
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const { start } = require('repl');

class DemoBase {

    // Constructor
    constructor(app, dirname) {
        // Save reference to app
        this.app = app;

        // Module path
        this.dirname = dirname;
        this.basename = path.basename(dirname)
        
        // Config
        this.config = JSON.parse(fs.readFileSync(`./demos/${this.basename}/index.json`))
        this.config.id = this.basename

        this.state = {
            running: false
        }

        this.stdData = Buffer.from("");

        this.setupRoutes();
    }

    // Sets up API routes
    setupRoutes() {
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());

        // Setup static path for web interface
        this.app.use(`/${this.basename}`, express.static(`./demos/${this.basename}/public`))

        // Setup state requests
        this.app.get(`/${this.basename}/state`, this.handleStateRequest.bind(this));
        this.app.get(`/${this.basename}/getStdData`, this.handleStdDataRequest.bind(this));

        // Setup demo start/stop api calls
        this.app.post(`/${this.basename}/start`, this.handleStartAPICall.bind(this))
        this.app.post(`/${this.basename}/stop`, this.handleStopAPICall.bind(this))
    }

    handleStartAPICall(req, res) {
        // Ignore if already running
        if (this.state.running) {
            this.sendStatus(200);
        }

        this.startDemo(req.body);
        res.sendStatus(200)
    }

    handleStopAPICall(req, res) {
        // Ignorre if already stopped
        if (!this.state.running) {
            this.sendStatus(200);
        }

        this.stopDemo(req.body);
        res.sendStatus(200);
    }

    handleStateRequest(req, res) {
        res.send(this.state);
    }

    handleStdDataRequest(req, res) {
        res.send({buffer: this.stdData.toString()})
    }

    startDemo(data) {
        console.log(data);
    }

    stopDemo(data) {
    }

    startProcess(command, args) {
        // Update running flag
        this.state.running = true;

        // Create child
        this.child = spawn(command, args);

        // Attach callbacks
        this.child.stdout.on('data', this.handleStdOut.bind(this));
        this.child.stderr.on('data', this.handleStdErr.bind(this));
        this.child.on('exit', this.handleOnExit.bind(this));
        this.child.on('error', this.handleOnError.bind(this));

        // Send message updating state
        this.wsUpdateState()
    }

    stopProcess() {
        this.child.kill()
    }

    handleStdOut(data) {
        // Update Buffer
        this.stdData = Buffer.concat([this.stdData, data])
        
        // Send latest buffer to WS clients
        this.ws.clients.forEach((client) => {
            client.send(JSON.stringify({
                id: this.basename,
                command: "newStdOut",
                "buffer": data.toString()
            }))
        });
    }

    handleStdErr(data) {
        // Update Buffer
        this.stdData = Buffer.concat([this.stdData, data])
        
        // Send latest buffer to WS clients
        this.ws.clients.forEach((client) => {
            client.send(JSON.stringify({
                id: this.basename,
                command: "newStdErr",
                "buffer": data.toString()
            }))
        });
    }

    handleOnExit(code, signal) {
        this.state.running = false;
        this.wsUpdateState()
    }

    handleOnError() {
        this.state.running = false;
        this.wsUpdateState()
    }

    wsUpdateState() {
        // Send latest buffer to WS clients
        this.ws.clients.forEach((client) => {
            client.send(JSON.stringify({
                id: this.basename,
                command: "updateState",
                "state": this.state
            }))
        });
    }
}

module.exports = DemoBase