'use strict';

(function() {

	const DEFAULT_FOLDER_STRING = 'src/collection';
	const DEFAULT_LINT__GLOBAL = [
		'**/*.js',
		'!node_modules/**',
		'!src/collection/**'
	];
	const DEFAULT_CONFIG_DIR = 'build/config';
	const DEFAULT_UTILS_DIR = 'build/utilities';

	var defaults = {
		DEFAULT_FOLDER_STRING,
		DEFAULT_LINT__GLOBAL,
		DEFAULT_CONFIG_DIR,
		DEFAULT_UTILS_DIR
	};

	var publicAPI = {
		defaults
	};

	module.exports = publicAPI;
	
})();
