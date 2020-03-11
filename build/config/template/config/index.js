'use strict';

(function() {

	var solution = require('./solution').solution;
	var dependencies = require('./dependencies').dependencies;
	var environments = require('./environments').environments;

	var publicAPI = {
		solution,
		dependencies,
		environments
	};

	module.exports = publicAPI;
	
})();
