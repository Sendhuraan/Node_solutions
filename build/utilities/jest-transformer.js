'use strict';

(function() {

	var tranformConfig = require('../config/babel.config.js');
	var { createTransformer } = require('babel-jest');

	module.exports = createTransformer(tranformConfig.browser);
	
})();
