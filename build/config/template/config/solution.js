'use strict';

(function() {

	// All paths start from source dir for better configuration
	var solution = {
		node: {
			lint: {
				pattern: ['config/**/*.js', '*.js', 'server/**/*.js', 'data/**/*.js'],
				options: 'defaultLintOptions'
			},
			test: {
				runner: 'jest',
				pattern: ['*_test.js', 'server/**/*_test.js']
			},
			bundle: {
				entry: 'index.js',
				output: {
					file: 'index.js'
				}
			}
		},
		browser: {
			lint: {
				pattern: ['client/**/*.js', 'client/**/*.jsx'],
				options: 'transpileLintOptions'
			},
			test: {
				runner: 'karma',
				pattern: ['client/**/*_test.jsx']
			},
			bundle: {
				entry: 'client/index.jsx',
				output: {
					dir: 'dist',
					file: 'bundle.js'
				}
			},
			template: {
				dir: 'client/templates',
				page: {
					dir: 'pages',
					file: 'index.js',
					data: 'index.data.json'
				}
			}
		},
		dirs: {
			node: ['server', 'data'],
			browser: ['client', 'shared'],
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
