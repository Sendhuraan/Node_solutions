'use strict';

(async function() {
	var fs = require('fs');
	var path = require('path');
	var util = require('util');

	const readFile = util.promisify(fs.readFile);
	const Server = require('./server/server.js');

	try {
		const configEnv = '/env.json';
		const configPath = path.join(__dirname, configEnv);

		const appConfig = JSON.parse(await readFile(configPath));

		const PORT = appConfig.server.port;
		const SERVE_DIR = appConfig.server.serveDir;
		const CONTENT_DIR = SERVE_DIR;

		const server = new Server();

		await server.start(CONTENT_DIR, PORT);
		console.log(`Server at localhost:${PORT}`);
	} catch (err) {
		if (err) {
			console.log(err);
		}
	}
})();
