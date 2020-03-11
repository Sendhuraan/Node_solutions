'use strict';

(function() {

	var fs = require('fs');
	var Linter = require('eslint').Linter;
	var linter = new Linter();

	exports.validateFiles = function validator(files, config) {

			var messages = [];
			var checkstatus = true;

			files.forEach(function(file) {
				messages = linter.verify(getSource(file), config);

				if(messages.length !== 0) {
					messages.forEach(function(message) {
						console.log('File: ' + file);
						console.log('Message: ' + message.message);
						console.log('Line: ' + message.line);
						console.log('--------------');
					});

					checkstatus = false;
				}

			});

			return checkstatus;
		};

		function getSource(file) {
			return fs.readFileSync(file, 'utf8');
		}
	
})();