'use strict';

(function() {
	var nodeExternals = require('webpack-node-externals');
	var transpileConfig = require('./babel.config.js');

	var node = {
		entry: '',
		mode: 'development',
		target: 'node',
		node: {
			__dirname: false
		},
		output: {
			path: '',
			filename: 'index.js'
		},
		externals: [nodeExternals()],
		module: {
			rules: [
				{
					test: /\.css$/,
					use: ['style-loader', 'css-loader']
				},
				{
					test: /\.(js|jsx)$/,
					use: {
						loader: 'babel-loader',
						options: transpileConfig.node
					}
				}
			]
		},
		plugins: [],
		resolve: {
			extensions: ['.js', '.jsx']
		}
	};

	var publicAPI = {
		node
	};

	module.exports = publicAPI;
})();
