'use strict';

(function() {
	const DEFAULT_FOLDER_STRING = 'src/collection';
	const DEFAULT_CONFIG_DIR = 'build/config';
	const DEFAULT_SERVE_DIR = 'node_modules/@sendhuraan/frontend-solutions/dist';

	var defaults = {
		DEFAULT_FOLDER_STRING,
		DEFAULT_CONFIG_DIR,
		DEFAULT_SERVE_DIR
	};

	var publicAPI = {
		defaults
	};

	module.exports = publicAPI;
})();
