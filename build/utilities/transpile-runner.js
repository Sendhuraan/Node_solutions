'use strict';

(function() {

	var babel = require('@babel/core');
	var through = require('through2');
	var Vinyl = require('vinyl');

	function transformFiles(file, options) {
		var output = babel.transform(file, options);

		return output.code;
	}

	function transpileFiles(options) {

		return through.obj(function(file, encoding, callback) {

			var isBuffer = false;
			var inputString = null;
			var result = null;

			console.log(file.isStream());

			//Empty file and directory not supported
			if (file === null || file.isDirectory()) {
				this.push(file);
				return callback();
			}
			isBuffer = file.isBuffer();

			if (isBuffer) {
				inputString = String(file.contents);
				result = transformFiles(inputString, options);

				var outputFile = new Vinyl({
					base: '/',
					path: `/${file.basename}`,
					contents: new Buffer(result)
				});

				callback(null, outputFile);
			}
			else {
				this.emit('error', new Error('Only Buffer format is supported'));
				callback();
			}


		});
	}

	var publicAPI = {
		transpileFiles
	};

	module.exports = publicAPI;
	
})();
