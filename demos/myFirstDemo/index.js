const DemoBase = require("../../demobase.js")

class MyFirstDemo extends DemoBase
{
    constructor(app) {
        // Call super constructor
        super(app, __dirname)
    }
}

module.exports = MyFirstDemo