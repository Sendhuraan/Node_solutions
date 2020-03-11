'use strict';

(function() {

	var Mocha = require('mocha');

	exports.runTests = function runTestFn(files, options, callback) {

		var mocha = new Mocha(options);

		files.forEach(function(file){
			mocha.addFile(file);
		});

		mocha.run(function(failures){
			if(failures) {
				return callback(new Error('Node Tests Failed'));
			}
			else {
				return callback();
			}
		});

	};

})();
