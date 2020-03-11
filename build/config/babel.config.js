'use strict';

(function() {

	var node = {
		presets: [
			['@babel/preset-react'],
			['@babel/preset-env', {
					'targets': {
						node: 'current'
					}
				}
			]
		]
	};
	
	var browser = {
		presets: ['@babel/preset-react', '@babel/preset-env']
	};

	var publicAPI = {
		node,
		browser
	};

	module.exports = publicAPI;

}());
