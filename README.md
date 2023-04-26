# rzboard_demo_launcher

This tool provides a web interface to launch and interact with demos on the RZBoard.

## Installation
This tool requires an image that has NodeJs and npm installed.  Simply clone the repo and run `npm install` in the repo:
```bash
git clone https://github.com/Avnet/rzboard_demo_launcher.git
cd rzboard_demo_launcher
npm install
```

## Usage
The launcher can be started by running the following from the repo directory:
```bash
node index.js
```

By default, the launcher will look for demo packages installed in a `demos` directory at the root of the repo directory: `rzboard_demo_launcher/demos`. This can be overridden by provided a path to the desired demos packages directory:
```bash
node index.js /path/to/demos/directory
```

## Demo Package
A demo package consists of a directory containing an `index.json` file and an optional `public` directory holding static webpage assets. The demo package directory must **NOT** contain any spaces or special characters. Here is an `index.json` file to work from:
```json
{
    "name": "My Demo Package",
    "description": "A demo package configuration.",
    "process": {
        "command": "./demo_application",
        "cwd": "/optional/path/to/cwd",
        "args": [
            "arg1"
        ],
        "environment": [
            {
                "name":"MY_VAR",
                "value":"MY_VAR_VALUE"
            }
        ]
    }
}
```

**NOTE:** The `cwd` property can be omitted and the `cwd` of the process will be set to the path of the demo package.
