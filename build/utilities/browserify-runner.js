'use strict';

var fs = require('fs');
var path = require('path');
var browserify = require('browserify');

exports.bundle = function(entryPoint, outFilename, success, failure) {
	var b = browserify({
		debug: true
	});

	b.add(path.resolve(entryPoint));
	b.bundle(function(err, bundle) {
		if (err) return failure(err);
		fs.writeFileSync(outFilename, bundle);
		return success();
	});
};