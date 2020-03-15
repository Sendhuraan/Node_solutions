'use strict';

(function() {
	var fs = require('fs');
	var path = require('path');

	const AWS = require('aws-sdk');
	AWS.config.update({
		region: 'ap-south-1'
	});

	var ec2_service = new AWS.EC2({
		apiVersion: '2016-11-15'
	});

	var ssm_service = new AWS.SSM({
		apiVersion: '2014-11-06'
	});

	function SolutionConfig(
		DEFAULTS,
		solutionDirName,
		serveDirName,
		commonConfigs,
		solutionConfigOptions
	) {
		var { DEFAULT_FOLDER_STRING, DEFAULT_SERVE_DIR } = DEFAULTS;

		var {
			lintConfig,
			nodeTestConfig,
			jestTestConfig,
			bundleConfig
		} = commonConfigs;

		var solutionConfig = solutionConfigOptions.solution;
		var solutionDependencies = solutionConfigOptions.dependencies;
		var solutionEnvironments = solutionConfigOptions.environments;

		var isNode = solutionConfig.node;
		var isNodeTest = solutionConfig.node.test;
		var isNodeBundle = solutionConfig.node.bundle;
		var serveDir = path.resolve(path.join(DEFAULT_SERVE_DIR, serveDirName));

		console.log('servePath', serveDir);

		if (solutionEnvironments) {
			var isCloudDeploy = solutionEnvironments.cloud.enabled;
			var isDependencies = solutionEnvironments.cloud.includeDependencies;
			var solutionMetadata = solutionEnvironments.cloud.metadata;
			var isNodeServer =
				solutionEnvironments.workstation.instance.parameters.server;
			var isNodeDB = solutionEnvironments.workstation.instance.parameters.db;
		}

		var SOURCE_DIR = `${DEFAULT_FOLDER_STRING}/${solutionDirName}`;

		if (isNode) {
			var NODE_LINT_PATTERN__PARAM = ['**/*.js'];

			var NODE_LINT_PATTERN = (function(param, inputDir) {
				return param.map(function(pattern) {
					if (pattern.includes('!')) {
						return `!${inputDir}/${pattern.split('!')[1]}`;
					} else {
						return `${inputDir}/${pattern}`;
					}
				});
			})(NODE_LINT_PATTERN__PARAM, SOURCE_DIR);

			if (!isCloudDeploy && (isNodeServer || isNodeDB)) {
				var NODE_DIR__PARAM = solutionConfig.dirs.node;
				var NODE_DIR = (function(param, inputDir) {
					if (param) {
						return param.map(function(folder) {
							return `${inputDir}/${folder}`;
						});
					} else {
						return inputDir;
					}
				})(NODE_DIR__PARAM, SOURCE_DIR);
			}
		}

		var OUTPUT_DIR__PARAM = solutionConfig.dirs.output;
		var OUTPUT_DIR__GROUP = (function(param, inputDir) {
			return `${inputDir}/${param}`;
		})(OUTPUT_DIR__PARAM, SOURCE_DIR);

		var DEVELOPMENT_DIR__PARAM = solutionConfig.dirs.development;
		var DEPLOY_DIR__PARAM = solutionConfig.dirs.deploy;

		var OUTPUT_DIR = (function(outputDir, inputDir, devDir, deployDir, cloud) {
			if (outputDir && deployDir && cloud) {
				return `${inputDir}/${outputDir}/${deployDir}`;
			} else if (outputDir && devDir) {
				return `${inputDir}/${outputDir}/${devDir}`;
			} else {
				return `${inputDir}`;
			}
		})(
			OUTPUT_DIR__PARAM,
			SOURCE_DIR,
			DEVELOPMENT_DIR__PARAM,
			DEPLOY_DIR__PARAM,
			isCloudDeploy
		);

		if (isNodeDB) {
			var NODE_DB_ENV_PARAMS =
				solutionEnvironments.workstation.instance.parameters.db;

			var NODE_DB_PARAMS = (function(envParams) {
				return {
					connectionURL: `${envParams.protocol}${
						envParams.username ? `${envParams.username}:` : ''
					}${envParams.password ? `${envParams.password}` : ''}@localhost:${
						envParams.port
					}`,
					name: `${envParams.name}`
				};
			})(NODE_DB_ENV_PARAMS);
		}

		if (isNodeTest) {
			var NODE_TEST_RUNNER__PARAM = solutionConfig.node.test.runner;
			var NODE_TEST_PATTERN__PARAM = solutionConfig.node.test.pattern;
			var NODE_TEST_REPORTER__PARAM = solutionConfig.node.test.reporter;
			var NODE_TEST_OPTIONS;
			var NODE_TEST_PATTERN;

			NODE_TEST_PATTERN = (function(param, inputDir) {
				return param.map(function(item) {
					return `${inputDir}/${item}`;
				});
			})(NODE_TEST_PATTERN__PARAM, SOURCE_DIR);

			if (NODE_TEST_RUNNER__PARAM === 'jest') {
				let { jestConfig } = jestTestConfig;
				var jestNodeTestConfig = Object.assign({}, jestConfig);

				let NODE_JEST_TEST_PATTERN = (function(param, inputDir) {
					return param.map(function(item) {
						return `${inputDir}/${item}`;
					});
				})(NODE_TEST_PATTERN__PARAM, '<rootDir>');

				jestNodeTestConfig.rootDir = SOURCE_DIR;
				jestNodeTestConfig.testEnvironment = 'node';
				jestNodeTestConfig.testMatch = NODE_JEST_TEST_PATTERN;
				jestNodeTestConfig.verbose = true;

				NODE_TEST_OPTIONS = {
					runner: NODE_TEST_RUNNER__PARAM,
					pattern: NODE_TEST_PATTERN,
					config: jestNodeTestConfig
				};
			} else if (NODE_TEST_RUNNER__PARAM === 'mocha') {
				if (NODE_TEST_REPORTER__PARAM === 'mochawesome') {
					nodeTestConfig.reporter = NODE_TEST_REPORTER__PARAM;
					nodeTestConfig.reporterOptions = {
						reportDir: `${SOURCE_DIR}/documentation`
					};
				}

				NODE_TEST_OPTIONS = {
					runner: NODE_TEST_RUNNER__PARAM,
					pattern: NODE_TEST_PATTERN,
					config: nodeTestConfig
				};
			} else {
				throw new Error('Node test runner not configured');
			}
		}

		if (isNodeBundle) {
			var NODE_BUNDLE_ENTRY__PARAM = solutionConfig.node.bundle.entry;
			var NODE_BUNDLE_OUTPUT_FILE__PARAM =
				solutionConfig.node.bundle.output.file;

			var NODE_BUNDLE_ENTRY = (function(param, inputDir) {
				return `${inputDir}/${param}`;
			})(NODE_BUNDLE_ENTRY__PARAM, SOURCE_DIR);

			var NODE_BUNDLE_OUTPUT_DIR = OUTPUT_DIR;

			var NODE_BUNDLE_OUTPUT_FILE = NODE_BUNDLE_OUTPUT_FILE__PARAM;

			var NODE_MAIN_FILE = (function(param, inputDir) {
				return `${inputDir}/${param}`;
			})(NODE_BUNDLE_OUTPUT_FILE, OUTPUT_DIR);

			var nodeBundleConfig = (function(config, entry, outputDir, outputFile) {
				var newConfig = Object.assign({}, config);

				newConfig.entry = path.resolve(entry);
				newConfig.output.path = path.resolve(outputDir);
				newConfig.output.filename = outputFile;

				if (isCloudDeploy) {
					newConfig.mode = solutionEnvironments.cloud.mode;
				}

				return newConfig;
			})(
				bundleConfig.node,
				NODE_BUNDLE_ENTRY,
				NODE_BUNDLE_OUTPUT_DIR,
				NODE_BUNDLE_OUTPUT_FILE
			);
		}

		if (isNodeServer) {
			var NODE_SERVER_ENV_PARAMS =
				solutionEnvironments.workstation.instance.parameters.server;

			NODE_SERVER_ENV_PARAMS.serveDir = serveDir;

			var NODE_SERVER_PARAMS = (function(envParams) {
				return {
					port: envParams.port,
					serveDir: envParams.serveDir
				};
			})(NODE_SERVER_ENV_PARAMS);
		}

		if (isCloudDeploy) {
			var solutionPackages = solutionDependencies;
			var globalSolutionConfig = require('../../package.json');

			var solutionPkgConfig = (function(config, metadata, listings) {
				var dependenciesObj = {};

				listings.map(function(listing) {
					dependenciesObj[listing] = config['dependencies'][listing];
				});

				delete config.devDependencies;
				config.dependencies = dependenciesObj;
				config.name = metadata.name;

				return config;
			})(globalSolutionConfig, solutionMetadata, solutionPackages);

			var isCloudServer = solutionEnvironments.cloud.parameters.server;
			var isCloudDB = solutionEnvironments.cloud.parameters.db;
		}

		/* eslint-disable no-mixed-spaces-and-tabs */
		this.config = {
			node: isNode
				? {
						lint: {
							pattern: OUTPUT_DIR__PARAM
								? [...NODE_LINT_PATTERN, `!${OUTPUT_DIR__GROUP}/**/*.js`]
								: [...NODE_LINT_PATTERN],
							options: lintConfig
						},
						test: isNodeTest ? NODE_TEST_OPTIONS : false,
						bundle: nodeBundleConfig ? nodeBundleConfig : false
				  }
				: false,
			build:
				!isCloudDeploy && (isNodeServer || isNodeDB || isNodeBundle)
					? {
							dirs: {
								source: SOURCE_DIR ? SOURCE_DIR : false,
								node: NODE_DIR ? NODE_DIR : false,
								output: NODE_BUNDLE_OUTPUT_DIR
									? NODE_BUNDLE_OUTPUT_DIR
									: OUTPUT_DIR,
								serve: serveDir
							},
							env: {
								workstation: {
									parameters: {
										server: NODE_SERVER_PARAMS ? NODE_SERVER_PARAMS : false,
										db: NODE_DB_PARAMS ? NODE_DB_PARAMS : false
									}
								}
							}
					  }
					: false,
			run: !isCloudDeploy
				? {
						dir: NODE_MAIN_FILE ? NODE_MAIN_FILE : OUTPUT_DIR
				  }
				: false,
			deploy: isCloudDeploy
				? {
						prepare: {
							includeDependencies: isDependencies ? isDependencies : false,
							solutionPkgConfig: solutionPkgConfig ? solutionPkgConfig : false
						}
				  }
				: false
		};
		/* eslint-enable no-mixed-spaces-and-tabs */

		this.replaceWithSSM = async function(parameter) {
			var cacheFile = path.resolve(`${SOURCE_DIR}/.tmp/aws.cache.json`);

			var ssmParameterCache = (function() {
				if (fs.existsSync(cacheFile)) {
					return require(cacheFile);
				} else {
					fs.mkdirSync(`${SOURCE_DIR}/.tmp`);
					return {};
				}
			})();

			var ssmTagPattern = /(ssm:)(\W\w+)/;

			if (ssmTagPattern.test(parameter)) {
				let ssmParameterName = parameter.replace(ssmTagPattern, '$2');

				if (ssmParameterCache[ssmParameterName]) {
					return ssmParameterCache[ssmParameterName];
				} else {
					let ssmParamDetails = {
						Name: `${ssmParameterName}`,
						WithDecryption: true
					};

					let fetchedParamDetails = await ssm_service
						.getParameter(ssmParamDetails)
						.promise();

					let fetchedParamValue = fetchedParamDetails.Parameter.Value;

					ssmParameterCache[ssmParameterName] = fetchedParamValue;

					fs.writeFileSync(
						cacheFile,
						JSON.stringify(ssmParameterCache, null, 4)
					);

					return fetchedParamValue;
				}
			} else {
				return parameter;
			}
		};

		this.getAsyncData = async function() {
			var instancesConfig = {};
			var commandsConfig = {};
			var cloudDBHostName = false;

			if (isCloudDeploy) {
				var { instances } = solutionEnvironments.cloud;

				instancesConfig.start = [];
				instancesConfig.create = [];

				for (let instance = 0; instance < instances.length; instance++) {
					let instanceFilters = {
						Filters: instances[instance].config.filters
					};

					let instanceDetails = await ec2_service
						.describeInstances(instanceFilters)
						.promise();

					if (instanceDetails.Reservations.length) {
						let instanceState =
							instanceDetails.Reservations[0].Instances[0].State.Name;
						let instanceId =
							instanceDetails.Reservations[0].Instances[0].InstanceId;

						if (instanceState === 'stopped') {
							instancesConfig.start.push(instanceId);
						} else {
							console.log(
								`${instanceId} cannot be started, as it is in ${instanceState} state`
							);
						}
					} else {
						let instanceParams = instances[instance].setup.compute.parameters;

						if (instanceParams.UserData) {
							instanceParams.UserData = new Buffer(
								instanceParams.UserData.join('\n')
							).toString('base64');
						}

						instancesConfig.create.push(instances[instance].setup);
					}
				}

				if (isCloudServer) {
					var NODE_CLOUD_SERVER_ENV_PARAMS =
						solutionEnvironments.cloud.parameters.server;
					let ssmResolvedParams = {};

					for (let param in NODE_CLOUD_SERVER_ENV_PARAMS) {
						ssmResolvedParams[param] = await this.replaceWithSSM(
							NODE_CLOUD_SERVER_ENV_PARAMS[param]
						);
					}

					var NODE_CLOUD_SERVER_PARAMS = {
						port: ssmResolvedParams.port,
						serveDir: serveDir
					};

					this.config.deploy.parameters = {};
					this.config.deploy.parameters.env = {};
					this.config.deploy.parameters.env.server = NODE_CLOUD_SERVER_PARAMS;
				}

				if (!(instancesConfig.create.length && instancesConfig.start.length)) {
					for (let instance = 0; instance < instances.length; instance++) {
						let instanceFilters = {
							Filters: instances[instance].config.filters
						};

						let instanceDetails = await ec2_service
							.describeInstances(instanceFilters)
							.promise();

						if (instanceDetails.Reservations.length) {
							let instanceId =
								instanceDetails.Reservations[0].Instances[0].InstanceId;
							let instanceCommands = instances[instance].commands;

							if (isCloudDB) {
								if (instances[instance].config.type === 'db') {
									cloudDBHostName =
										instanceDetails.Reservations[0].Instances[0].PublicDnsName;
								}

								var NODE_CLOUD_DB_ENV_PARAMS =
									solutionEnvironments.cloud.parameters.db;
								var NODE_CLOUD_DB_HOSTNAME = cloudDBHostName;
								let ssmResolvedParams = {};

								for (let param in NODE_CLOUD_DB_ENV_PARAMS) {
									ssmResolvedParams[param] = await this.replaceWithSSM(
										NODE_CLOUD_DB_ENV_PARAMS[param]
									);
								}

								if (NODE_CLOUD_DB_HOSTNAME) {
									var NODE_CLOUD_DB_PARAMS = {
										connectionURL: `${ssmResolvedParams.protocol}${
											ssmResolvedParams.username
												? ssmResolvedParams.username
												: ':'
										}${
											ssmResolvedParams.password
												? ssmResolvedParams.password
												: '@'
										}${NODE_CLOUD_DB_HOSTNAME}:${ssmResolvedParams.port}`,
										name: `${ssmResolvedParams.name}`
									};
								} else {
									console.log(
										'DB Instance not configured. No host found running'
									);
								}

								this.config.deploy.parameters.env.db = NODE_CLOUD_DB_PARAMS;
							}

							for (let command in instanceCommands) {
								commandsConfig[command] = {};
								commandsConfig[command]['Parameters'] = {};
								commandsConfig[command]['InstanceIds'] = [];

								if (instanceCommands[command]['inject'] === true) {
									let injectParams = this.config.deploy.parameters;

									let paramResolvedCommand = instanceCommands[command][
										'commands'
									].map(function(command) {
										let injectParamPattern = /(calc:{)(\w+)(})/;

										if (injectParamPattern.test(command)) {
											let injectParamName = command.match(
												injectParamPattern
											)[2];
											let injectParamResolved = `"${JSON.stringify(
												injectParams[injectParamName]
											).replace(/"/g, '\\"')}"`;
											command = command.replace(
												injectParamPattern,
												injectParamResolved
											);
										}

										return command;
									});

									commandsConfig[command]['Parameters'][
										'commands'
									] = paramResolvedCommand;
								} else {
									commandsConfig[command]['Parameters']['commands'] =
										instanceCommands[command]['commands'];
								}

								commandsConfig[command]['DocumentName'] =
									instanceCommands[command]['documentType'];
								commandsConfig[command]['InstanceIds'].push(instanceId);
							}
						}
					}
				}
			}

			var asyncData = {
				instances: Object.keys(instancesConfig).length
					? instancesConfig
					: false,
				commands: Object.keys(commandsConfig).length ? commandsConfig : false
			};

			return asyncData;
		};
	}

	SolutionConfig.prototype.getConfig = async function() {
		var asyncDataResolved = await this.getAsyncData();

		if (this.config.deploy) {
			this.config.deploy.instances = asyncDataResolved.instances;
			this.config.deploy.commands = asyncDataResolved.commands;
		}

		return this.config;
	};

	var publicAPI = {
		SolutionConfig
	};

	module.exports = publicAPI;
})();
