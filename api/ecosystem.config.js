const path = require('path');

module.exports = {
    apps: [
        {
            name: "sigaweb-api",
            script: path.resolve(__dirname, "dist/index.js"),
            cwd: __dirname,
            interpreter: "node",
            node_args: "--env-file=.env",
            exec_mode: "fork",
            instances: 1,
            watch: false
        }
    ]
};