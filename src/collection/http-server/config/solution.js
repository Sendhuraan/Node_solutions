'use strict';

(function () {
	var solution = {
		node: {
			test: {
				runner: 'jest',
				pattern: ['*_test.js', 'server/**/*_test.js']
			}
		},
		dirs: {
			node: ['server'],
			browser: ['client'],
			output: 'output',
			development: 'workstation',
			deploy: 'deploy'
		}
	};

	var publicAPI = {
		solution
	};

	module.exports = publicAPI;
})();
