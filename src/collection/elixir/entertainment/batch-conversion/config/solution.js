'use strict';

(function () {
	var solution = {
		node: {
			test: false
		},
		dirs: {
			node: ['server'],
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
