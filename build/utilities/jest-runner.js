'use strict';

(function() {

	const jest = require('jest-cli');

	function runTests(options, callback) {
		jest.runCLI(options, [process.cwd()])

		.then(function() {
			callback();
		})
		.catch(function(err) {
			callback(new Error(err));
		});
	}

	var publicAPI = {
		runTests
	};

	module.exports = publicAPI;
	
})();
