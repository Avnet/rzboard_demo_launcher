const express = require('express')
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const pty = require('node-pty')
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
        this.config = JSON.parse(fs.readFileSync(`${global.__demosDir}/${this.basename}/index.json`))
        this.config.id = this.basename

        this.state = {
            running: false
        }
		this.childPty = null;
        this.stdData = Buffer.from("");

        this.setupRoutes();
    }

    // Sets up API routes
    setupRoutes() {
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());

        // Setup static path for web interface
        this.app.use(`/${this.basename}`, express.static(`${global.__demosDir}/${this.basename}/public`))

        // Setup state requests
        this.app.get(`/${this.basename}/state`, this.handleStateRequest.bind(this));
        this.app.get(`/${this.basename}/getStdData`, this.handleStdDataRequest.bind(this));

        // Setup demo start/stop api calls
        this.app.post(`/${this.basename}/start`, this.handleStartAPICall.bind(this))
        this.app.post(`/${this.basename}/stop`, this.handleStopAPICall.bind(this))

		this.clients = []

		this.app.ws(`/${this.basename}`, (ws, req) => {
			this.clients.push(ws);
			ws.on("message", this.handleWebsocketMessage.bind(this))
		});
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
		this.startProcess();
    }

    stopDemo(data) {
		this.stopProcess();
    }

    startProcess() {
        // Update running flag
        this.state.running = true;

        // Create child
        this.childPty = pty.spawn(
			this.config.process.command,
			this.config.process.args,
			{
				name: 'xterm-color',
				cols: 80,
				rows: 30,
				cwd: this.config.process.cwd ? this.config.process.cwd : process.env.HOME,
				env: this.config.process.environment
			}
		);

        // Attach callbacks
        this.childPty.on('data', this.handlePtyBuffer.bind(this));
		this.childPty.on("error", this.handleOnError.bind(this));
		this.childPty.on("exit", this.handleOnExit.bind(this));

        // Send message updating state
        this.wsUpdateState()
    }

    stopProcess() {
        this.childPty.kill()
    }

	handlePtyBuffer(data) {
		if (this.clients) {
			this.clients.forEach((client) => {
				client.send(JSON.stringify({
					id: this.basename,
					command: "updatePTYBuffer",
					buffer: data.toString()
				}));
			});
		}
	}

	handleWebsocketMessage(msg) {
		const payload = JSON.parse(msg);
		
		if (payload.command === "resize") {
			if (!this.childPty)
				return;
			this.childPty.resize(payload.cols, payload.rows)
		} else {
			if (!this.childPty)
				return;
			this.childPty.write(payload.buffer);
		}

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