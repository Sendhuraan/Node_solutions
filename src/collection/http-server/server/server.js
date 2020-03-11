'use strict';

(function() {

	const HttpServer = require('./http-server.js');

	module.exports = class Server {

		async start(contentDir, portNumber) {
			if (!portNumber) throw new Error('port number is required');

			this._httpServer = new HttpServer(contentDir);
			await this._httpServer.start(portNumber);

		}

	};

}());
