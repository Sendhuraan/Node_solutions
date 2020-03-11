'use strict';

(function() {
	var finalhandler = require('finalhandler');
	var http = require('http');
	var serveStatic = require('serve-static');
	var util = require('util');

	module.exports = class HttpServer {
		constructor(contentDir) {
			console.log(contentDir);
			var serve = serveStatic(contentDir, {
				index: ['index.html', 'index.htm']
			});

			this._httpServer = http.createServer(function onRequest(req, res) {
				serve(req, res, finalhandler(req, res));
			});
		}

		start(portNumber) {
			const listen = util.promisify(
				this._httpServer.listen.bind(this._httpServer)
			);
			return listen(portNumber);
		}

		stop() {
			const close = util.promisify(
				this._httpServer.close.bind(this._httpServer)
			);
			return close();
		}

		getNodeServer() {
			return this._httpServer;
		}
	};
})();
