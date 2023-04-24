const FitAddonC = FitAddon.FitAddon;
let app = null;

// Main Application
class Application {
    // Class constructor
    constructor() {
        // Create terminal
        this.terminal = new Terminal();
        this.fitAddon = new FitAddonC()
        this.terminal.open(document.getElementById("terminal"));
		this.terminal.onData((data) => { this.handleTerminalData(data); });

        // Demos list
        this.demos = [];

        // Create websocket
        this.ws = new WebSocket("ws://" + location.hostname + ":" + location.port + "/");
        this.ws.onmessage = this.handleWsMessage.bind(this);
	
        this.initialUISetup();

		this.getDemoList()

        document.getElementById("reloadDemosButton").addEventListener("click", this.reloadDemoList.bind(this));
    }

    setActiveDemo(demo) {
	if (this.activeDemo) {
		this.activeDemo.becomeInactive()
	}

	this.activeDemo = demo;
	demo.becomeActive();
    }

    getDemoList() {
		fetch("/getDemoList")
		.then((res) => res.json())
		.then((demos) => {
			demos.forEach((demo) => {
				this.demos.push(new Demo(demo));
			});
		});
    }

    reloadDemoList() {
        fetch("/reloadDemoList")
        .then((res) => res.json())
        .then((demos) => {
            document.getElementById("leftMenuList").innerHTML = "";
            demos.forEach((demo) => {
                this.demos.push(new Demo(demo));
            });
        });
    }

    // Handle initial UI Setup
    initialUISetup() {
        // Handle themeing
        if (document.querySelector("html").dataset.bsTheme === "dark")
        {
            document.getElementById("brandingImage").src = "assets/Avnet_logo_no-tagline_rgb_white.svg";
        } else {
            document.getElementById("brandingImage").src = "assets/Avnet_logo_no-tagline_rgb.svg";
        }

        // Handle Window Sizing
        window.addEventListener("resize", this.handleResize.bind(this));
        this.terminal.loadAddon(this.fitAddon)
        this.fitAddon.fit()
    }

    // Handle media query updates
    handleMediaQuery(e) {
        // Auto hide side bar for mobile
        if (e.matches) {
            document.getElementById("leftSideBar").classList.remove("show");
        } else {
            document.getElementById("leftSideBar").classList.add("show");
        }
    }

    // Handle resize event
    handleResize(e) {
        if (this.activeDemo) {
		this.activeDemo.handleResize();
	}
    }

    handleWsConnect() {
        // Send terminal size
        this.ws.send(JSON.stringify({
            command: "resize", 
            rows: this.terminal.rows,
            cols: this.terminal.cols
        }));
    }

    handleWsMessage(msg) {
        const data = JSON.parse(msg.data);
        this.terminal.write(data.buffer);
    }

    handleTerminalData(data) {
	if (this.activeDemo) {
		this.activeDemo.handleTerminalData(data);
	}
    }

};

// Demo Object class
class Demo {
    // Config prototype
    config = {
        id: "",
        name: "",
        description: "",
        process: {
            command: "",
            args: [],
            environment: []
        }
    }

    // Class constructor
    constructor(config) {
        // Demo config and state
        this.config = config;
        this.state = {
		running: false
	};

        // PTY Buffer
        this.ptyBuffer = [];
        this.ptyBufferMaxLength = 1000;

		// UI Elements
		this.listItem = null;
		this.listRunningIndicator = null;

		this.addToList();

		this.getState();

		this.ws = new WebSocket("ws://" + location.hostname + ":" + location.port + "/" + this.config.id);
		this.ws.onmessage = this.handleWebsocketMessage.bind(this);
    }

	getState() {
		fetch("/" + this.config.id + "/state")
		.then((res) => res.json())
		.then((payload) => {
			this.state = payload;
			this.updateUI();
		});
	}

    addToList() {

	// Create list button
	this.listItem = document.createElement("a")
	this.listItem.href = "#"
	this.listItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-start");
	this.listItem.addEventListener("click", () => { app.setActiveDemo(this); });
	
	// Add Title
	let container = document.createElement("div");
	container.classList.add("ms-2",  "me-auto");
	
	let titleEl = document.createElement("div");
	titleEl.classList.add("fw-bold");
	titleEl.innerText = this.config.name;
	container.appendChild(titleEl);

	// Add running indicator
	this.listRunningIndicator = document.createElement("span");
	this.listRunningIndicator.classList.add("badge", "rounded-pill");
	this.listRunningIndicator.innerText = "Not Running";
	container.appendChild(this.listRunningIndicator)

	// Add item to list
	this.listItem.appendChild(container);
	document.getElementById("leftMenuList").appendChild(this.listItem);

    }

    becomeActive() {
		// Update title and description
		document.getElementById("demoTitle").innerText = this.config.name;
		document.getElementById("demoDescription").innerText = this.config.description;

        // Bind toggle demo button
        document.getElementById("demoToggleButton").onclick = this.toggleDemo.bind(this)

        // Bind settings buttons
        document.getElementById("demoAddArgumentButton").onclick = () => { this.addArgumentField() };
        document.getElementById("demoAddEnvVarField").onclick = () =>  { this.addEnvVarField() };

        // Setup Settings Modal
        demoSettingsButton.onclick = this.setupSettingsModal.bind(this);
        document.getElementById("demoSettingsSaveButton").onclick = this.saveSettings.bind(this);

		// Setup Demo Page Button
		document.getElementById("demoPageButton").onclick = () => { window.open("/" + this.config.id, '_blank'); }

        // Populate terminal
        app.terminal.reset();

        this.ptyBuffer.forEach((data) => {
            app.terminal.write(data);
        });
	
		this.listItem.classList.add("active");
        this.active = true;

		this.updateUI();
    }
    
    becomeInactive() {
	this.listItem.classList.remove("active");

	this.active = false;
    }

    // Function to add argument field in settings
    addArgumentField(arg = "") {
        // Field group
        let group = document.createElement("div");
        group.classList.add("input-group")
        group.classList.add("demo-settings-input");
        
        // Text field
        let field = document.createElement("input");
        field.setAttribute("type", "text");
        field.value = arg;
        field.placeholder = "Argument";
        field.classList.add(["form-control"]);
        field.name = "arg";

        // Remove button
        let button = document.createElement("button");
        button.classList.add("btn");
        button.classList.add("btn-outline-secondary");
        button.classList.add("d-inline-block");
        button.innerText = "Remove";
        button.addEventListener("click", (e) => {
            group.remove()
        })

        // Add nodes
        group.appendChild(field);
        group.appendChild(button);
        document.getElementById("demoArgumentsList").appendChild(group);
    }
    
    // Function to add argument field in settings
    addEnvVarField(name = "", value = "") {
        // Field group
        let group = document.createElement("div");
        group.classList.add("input-group");
        group.classList.add("demo-settings-input");
        
        // Text field
        let nameField = document.createElement("input");
        nameField.setAttribute("type", "text");
        nameField.placeholder = "Name";
        nameField.value = name;
        nameField.classList.add(["form-control"]);
        nameField.name = "name";

        // Text field
        let valueField = document.createElement("input");
        valueField.setAttribute("type", "text");
        valueField.placeholder = "Value";
        valueField.value = value;
        valueField.classList.add(["form-control"]);
        valueField.name = "value";

        // Remove button
        let button = document.createElement("button");
        button.classList.add("btn");
        button.classList.add("btn-outline-secondary")
        button.classList.add("d-inline-block");
        button.innerText = "Remove";
        button.addEventListener("click", (e) => {
            group.remove()
        });

        // Add nodes
        group.appendChild(nameField);
        group.appendChild(valueField)
        group.appendChild(button);
        document.getElementById("demoEnvVariablesList").appendChild(group);
    }

    // Function to handle demo button press
    toggleDemo() {
		if (!this.state.running) {
			fetch(`/${this.config.id}/start`, {method: 'POST'})
		} else {
			fetch(`/${this.config.id}/stop`, {method: 'POST'})
		}
    }

    // Setup Settings Modal view
    setupSettingsModal() {
        // Get list nodes
        let demoArgsListNode = document.getElementById("demoArgumentsList");
        let demoEnvVarListNode = document.getElementById("demoEnvVariablesList");

        // Clear lists
        demoArgsListNode.innerHTML = "";
        demoEnvVarListNode.innerHTML = "";

        // Populate args list
        this.config.process.args.forEach((arg) => {
            this.addArgumentField(arg.toString());
        });

        // Populate env var list
        this.config.process.environment.forEach((env) => {
            this.addEnvVarField(env.name.toString(), env.value.toString());
        });
    }

    // Save settings
    saveSettings() {
        // Clear out existing settings
        this.config.process.args = new Array();
        this.config.process.environment = new Array();

        // Get nodes
        let argNodes = document.getElementById("demoArgumentsList").childNodes;
        let envNodes = document.getElementById("demoEnvVariablesList").childNodes;

        // Loop through args nodes
        argNodes.forEach((node) => {
            // Push back argument
            let arg = node.getElementsByTagName("input")[0].value;
            this.config.process.args.push(arg);
        });

        // Loop through env nodes
        envNodes.forEach((node) => {
            // Push back environment variable
            this.config.process.environment.push({
                name: node.getElementsByTagName("input")[0].value,
                value: node.getElementsByTagName("input")[1].value
            });
        });

        fetch(
            "/" + this.config.id + "/updateConfig",
            {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.config)
            }
        );
    }

    // Handle websocket messages
    handleWebsocketMessage(msg) {
		const payload = JSON.parse(msg.data);

        // Only listen to our messages
        switch(payload.command) {
		case "updatePTYBuffer":
			this.handlePTYBuffer(payload);
			break;
		case "updateState":
			this.handleStateChange(payload);
			break;
		default:
			break;
	}
    }

    handleTerminalData(data) {
        // Write key to websocket
        this.ws.send(JSON.stringify({command: "writeBuffer", buffer: data}));
    }

    // Handle receiving terminal data
    handlePTYBuffer(msg) {
        // Shift if max length reached
        if (this.ptyBuffer.length === this.ptyBufferMaxLength)
        {
            this.ptyBuffer.shift()
        }

        // Push message into buffer
        this.ptyBuffer.push(msg.buffer);

        // If active, write data to terminal
        if (this.active) {
            app.terminal.write(msg.buffer);
        }
    }

    handleResize() {
	// Refit terminal
        app.fitAddon.fit();
        this.ws.send(JSON.stringify({
            command: "resize", 
            rows: app.terminal.rows,
            cols: app.terminal.cols
        }));
    }

	updateUI() {
		if (this.state.running) {
			this.listRunningIndicator.innerText = "Running";
			this.listRunningIndicator.classList.add("bg-success");
		} else {
			this.listRunningIndicator.innerText = "Not Running";
			this.listRunningIndicator.classList.remove("bg-success");
		}

		if (this.active) {
			let toggleButton = document.getElementById("demoToggleButton");
			let toggleButtonChild = toggleButton.childNodes[0];

			if (this.state.running) {
				toggleButton.classList.remove("btn-outline-success")
				toggleButton.classList.add("btn-outline-danger");
				toggleButtonChild.classList.remove("bi-play-fill")
				toggleButtonChild.classList.add("bi-stop-fill")
				
			} else {
				toggleButton.classList.add("btn-outline-success");
				toggleButton.classList.remove("btn-outline-danger");
				toggleButtonChild.classList.add("bi-play-fill")
				toggleButtonChild.classList.remove("bi-stop-fill")
			}
		}
	}

    // Handle state change
    handleStateChange(msg) {
		console.log(msg);
		if (msg.id === this.config.id) {
			this.state = msg.state;
		}

		this.updateUI();
    }
}

// Entry point
document.addEventListener("DOMContentLoaded", () => {
    // Create Application
    app = new Application()    
});

