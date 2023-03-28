class Application {
    
    constructor() {
        this.getDemoList();
        this.activeDemo = null;
        this.demos = [];

        this.stdData = "";

        this.connectWebsockets();
    }

    // Get list of demos and write to page
    getDemoList() {
        fetch("/getDemoList")
        .then((res) => res.json())
        .then((data) => {             
            // Fetch list from server
            data.forEach((demo) => {
                // Create demo and push to list of demos
                let demoInst = new Demo(demo);
                demoInst.addEventListener('becameActive', this.onDemoBecameActive.bind(this) )
                this.demos.push(demoInst);
            });
        });    
    }

    onDemoBecameActive(e) {
        this.activeDemo = e.target;
    }

    connectWebsockets() {
        this.ws = new WebSocket("ws://" + window.location.host + "/")
        this.ws.onmessage = this.handleWebsocketMessage.bind(this);
    }

    handleWebsocketMessage(data) {
        this.demos.forEach((demo) => {
            demo.handleWebsocketMessage(data)
        })
    }

};

class Demo extends EventTarget {
    constructor(demo) {
        super()

        // Set properties
        this.basename = demo.id;
        this.name = demo.demoName;
        this.description = demo.demoDescription;

        this.state = {}
        this.stdData = "";

        this.createUIElement()
        this.getState();
        this.getStdData();
    }

    getState() {
        fetch(`/${this.basename}/state`)
        .then((res) => res.json())
        .then((data) => {
            this.state = data;
            this.updateUI();
        })
    }

    getStdData() {
        fetch(`/${this.basename}/getStdData`)
        .then((res) => res.json())
        .then((data) => {
            this.stdData = data.buffer;
            this.updateUI();
        })
    }

    createUIElement() {
        // Demo list html element
        let demoEl = document.getElementById("demoList");

        // Create link and append to list element
        this.item = document.createElement("a");
        this.item.setAttribute("class", "list-group-item list-group-item-action list-group-item-light p-3");
        this.item.href = "#";
        this.item.innerText = this.name;

        this.activeBadge = document.createElement("span");
        this.activeBadge.setAttribute("class", "badge badge-pill");
        this.activeBadge.setAttribute("style", "position:absolute; right:10px;")
        this.activeBadge.innerText = "Not Running";
        this.item.appendChild(this.activeBadge);

        demoEl.appendChild(this.item);

        this.item.addEventListener("click", (e) => { this.becomeActive(); });
    }

    toggleDemo() {
        if (!this.state.running)
        {
            fetch(`/${this.basename}/start`, {method: 'POST'})
        }
        else
        {
            fetch(`/${this.basename}/stop`, {method: 'POST'})
        }
    }

    updateUI() {
        let activeDemoStartButton = document.getElementById("startDemoButton");

        if (this.state.running)
        {
            this.activeBadge.innerText = "Running";
            this.activeBadge.classList.add("badge-success");

            activeDemoStartButton.classList.add("btn-outline-danger")
            activeDemoStartButton.classList.remove("btn-outline-success")
            activeDemoStartButton.innerText = "Stop Demo"
        }
        else
        {
            this.activeBadge.classList.remove("badge-success");
            this.activeBadge.innerText = "Not Running";

            activeDemoStartButton.classList.remove("btn-outline-danger")
            activeDemoStartButton.classList.add("btn-outline-success")
            activeDemoStartButton.innerText = "Start Demo"
        }

        if (app.activeDemo == this)
        {
            document.getElementById("terminal").value = this.stdData;
        }
    }

    becomeActive()
    {
        // Ignore if already active
        if (app.activeDemo == this) {
            return;
        }

        // Get active demo content elements
        let activeDemoTitle = document.getElementById("activeDemoTitle");
        let activeDemoDescription = document.getElementById("activeDemoDescription");
        let activeDemoStartButton = document.getElementById("startDemoButton");
        let activeDemoPageButton = document.getElementById("demoPageButton");

        // Set title
        activeDemoTitle.innerText = this.name;
        activeDemoDescription.innerText = this.description;

        // Enable buttons
        activeDemoStartButton.disabled = true;
        activeDemoStartButton.disabled = false;
        activeDemoPageButton.disabled = false;

        activeDemoStartButton.onclick = this.toggleDemo.bind(this);
        activeDemoPageButton.onclick = () => {window.open(this.basename, '_blank')}
        
        this.dispatchEvent( new Event('becameActive', this))

        this.updateUI();
    }

    handleWebsocketMessage(msg)
    {
        const data = JSON.parse(msg.data);
        
        // Ignore data that doesn't belong to us
        if (data.id != this.basename)
        {
            return
        }

        switch(data.command)
        {
            case "updateState":
                this.handleStateMessage(data)
                break;
            case "newStdOut":
                this.handleStdData(data);
                break;
        }
    }

    handleStateMessage(data)
    {
        this.state = data.state;
        this.updateUI()
    }

    handleStdData(data)
    {
        this.stdData += data.buffer;
        document.getElementById("terminal").value += data.buffer;
        document.getElementById("terminal").scrollTop = document.getElementById("terminal").scrollHeight 
    }
}

let app = null;
document.addEventListener("DOMContentLoaded", domLoaded, false);
function domLoaded(e)
{
    app = new Application();

}
  