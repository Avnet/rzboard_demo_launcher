// Require demo baseclass script
const DemoBase = require(`${global.__basedir}/demobase.js`)

// Create demo class
class ExampleDemo extends DemoBase {
    // Create constructor that excepts application
    constructor(app) {
        // Call super constructor with app and directory path
        super(app, __dirname)

        // Do any other setup you'd like
    }

    // Set up any API endpoints for the demo application
    setupRoutes() {
        // Always call super()
        super.setupRoutes()

        this.app.get(`/${this.basename}/random`, this.random.bind(this))
    }

    // Handle when request to start demo is received
    startDemo(data) {
        // Run a process on hardware to print all devices
        this.startProcess("ls", ["-ltr", "/dev"])
    }

    // Handle when request to stop demo is received
    stopDemo(data) {
        console.log("Demo stop request created.")
    }

    // API Handler for random endpoint
    random(req, res) {
        res.send({
            value: Math.floor(Math.random() * 100000)
        })
    }
}

// Export class
module.exports = ExampleDemo