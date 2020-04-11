'use strict';

(function () {
	var fs = require('fs');
	var path = require('path');

	const { src, series, parallel, dest, watch } = require('gulp');
	var program = require('commander');
	const eslint = require('gulp-eslint');
	var webpack = require('webpack');
	var shell = require('shelljs');
	var child_process = require('child_process');
	var globby = require('globby');
	const inquirer = require('inquirer');
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

	program
		.option('-d --dir <value>', 'Input folder name')
		.option('-s --serve-dir <value>', 'Serve folder name')
		.option('--debug <value>', 'Build environment')
		.parse(process.argv);

	var DIRNAME = program.dir;
	var SERVE_DIR = program.serveDir;
	var DEBUG_PORT = Number(program.debug);

	var commonConfigs = {
		lintConfig: require('./.eslintrc.js'),
		nodeTestConfig: require('./build/config/mocha.config.js'),
		jestTestConfig: require('./build/config/jest.config.js'),
		bundleConfig: require('./build/config/webpack.config.js')
	};

	var { SolutionConfig } = require('./build/utilities/config-generator');
	var DEFAULTS = require('./build/config/constants').defaults;

	var { DEFAULT_SERVE_DIR } = DEFAULTS;

	var pageConfigOptions = (function (dir) {
		var path = `./src/collection/${dir}/config`;

		if (fs.existsSync(path)) {
			return require(path);
		} else {
			throw new Error('NO CONFIG FOUND FOR SOLUTION');
		}
	})(DIRNAME);

	var sourceDirName = (function (dir) {
		var path = `./src/collection/${dir}`;

		if (!dir) {
			throw new Error('NO FOLDER NAME SPECIFIED');
		} else if (!fs.existsSync(path)) {
			throw new Error('FOLDER DOES NOT EXISTS');
		} else {
			return dir;
		}
	})(DIRNAME);

	var serveDirName = (function (dir) {
		var path = `${DEFAULT_SERVE_DIR}/${dir}`;

		if (!fs.existsSync(path)) {
			throw new Error('SERVE DIRECTORY DOES NOT EXISTS');
		} else {
			return dir;
		}
	})(SERVE_DIR);

	var solutionConfig = new SolutionConfig(
		DEFAULTS,
		sourceDirName,
		serveDirName,
		commonConfigs,
		pageConfigOptions
	);
	var config;

	async function getConfig() {
		config = await solutionConfig.getConfig();
	}

	function printConfig(cb) {
		console.log(JSON.stringify(config, null, 4));
		cb();
	}

	function lintNodeFiles(cb) {
		var { lint } = config.node;

		if (!lint) {
			cb();
		} else {
			return src(globby.sync(lint.pattern))
				.pipe(eslint(lint.options))
				.pipe(eslint.format())
				.pipe(eslint.failAfterError());

			cb();
		}
	}

	function runNodeTests(cb) {
		var { test } = config.node;

		if (!test) {
			cb();
		} else {
			switch (test.runner) {
				case 'jest':
					var jestRunner = require('./build/utilities/jest-runner.js');
					jestRunner.runTests(test.config, cb);
					break;

				case 'mocha':
					var mochaRunner = require('./build/utilities/mocha-runner.js');
					mochaRunner.runTests(globby.sync(test.pattern), test.config, cb);
					break;

				default:
					mochaRunner.runTests(globby.sync(test.pattern), test.config, cb);
					break;
			}
		}
	}

	function cleanOutputDir(cb) {
		var isBundle_node = config.node.bundle;

		if (isBundle_node) {
			let { output } = config.build.dirs;
			let { filename } = config.node.bundle.output;
			shell.rm('-rf', `${output}/${filename}`);
		}

		cb();
	}

	function bundleNode(cb) {
		var isBundle_node = config.node.bundle;

		if (!isBundle_node) {
			cb();
		} else {
			let { path } = config.node.bundle.output;
			let { bundle } = config.node;
			shell.rm('-rf', path);

			webpack(bundle, function (err, stats) {
				if (err) {
					console.error(err.stack || err);
					if (err.details) {
						console.error(err.details);
					}
					return;
				}

				const info = stats.toJson();

				if (stats.hasErrors()) {
					console.error(info.errors);
				}

				if (stats.hasWarnings()) {
					console.warn(info.warnings);
				}

				cb();
			});
		}
	}

	function copyServerFiles() {
		var { source, node, output, serve } = config.build.dirs;

		shell.rm('-rf', `${output}/*.js`);
		shell.mkdir('-p', output);
		shell.mkdir('-p', serve);

		if (source === node) {
			shell.cp('-R', `${source}/*.js`, `${output}`);
		} else {
			shell.cp('-R', ...node, `${source}/*.js`, `${output}`);
		}
	}

	function build(cb) {
		var { build } = config;
		var { deploy } = config;

		if (!build) {
			cb();
		} else {
			var { parameters } = config.build.env.workstation;
			var { output } = config.build.dirs;
			var { bundle } = config.node;

			if (!bundle) {
				copyServerFiles();
			}

			if (!deploy) {
				shell.rm('-rf', `${output}/*.json`);

				fs.writeFile(
					`${output}/env.json`,
					JSON.stringify(parameters, null, 4),
					function (err) {
						if (err) {
							throw err;
						} else {
							cb();
						}
					}
				);
			} else {
				cb();
			}
		}
	}

	function runSolution(cb) {
		var { dir } = config.run;
		var solutionProcess;

		if (!DEBUG_PORT) {
			solutionProcess = child_process.fork(`${dir}`);
		} else {
			solutionProcess = child_process.fork(`${dir}`, [], {
				execArgv: [`--inspect-brk=${DEBUG_PORT}`]
				// TODO: Implement debug logging (See page:97 in node-cookbook)
				// env: {
				// 	DEBUG: '*',
				// 	NODE_DEBUG: 'timer'
				// }
			});
			console.log(
				`Open chrome://inspect. If no target was found, click configure and add localhost:${DEBUG_PORT}`
			);
		}

		// TODO Implement watch in JS_solutions.

		if (config.build) {
			const { source, node, output } = config.build.dirs;

			const nodeWatcher = watch([
				`${source}/*.js`,
				`${node}/**/*`,
				`!${output}/*`
			]);

			console.log(
				'Watching changes for following ' +
					'\n' +
					`${source}/*.js` +
					'\n' +
					`${node ? `${node}/**/.js` : ''}`
			);

			nodeWatcher.on('change', function (filepath) {
				console.log(`File ${filepath} was changed`);
				solutionProcess.kill('SIGINT');
				nodeWatcher.close();

				console.log('Regenerating solution...');
				series(runNodeTests, bundleNode, build, runSolution)();
				cb();
			});
		} else {
			const { dir } = config.run;
			const solutionWatcher = watch([`${dir}/*.js`]);

			console.log('Watching changes for following ' + '\n' + `${dir}/*.js`);

			solutionWatcher.on('change', function (filepath) {
				console.log(`File ${filepath} was changed`);
				solutionProcess.kill('SIGINT');
				solutionWatcher.close();

				console.log('Regenerating solution...');
				series(runSolution)();
				cb();
			});
		}

		cb();
	}

	function createDeployment(cb) {
		var { solutionPkgConfig } = config.deploy.prepare;
		var { includeDependencies } = config.deploy.prepare;
		var { output } = config.build.dirs;

		shell.cp('package-lock.json', `${output}`);
		fs.writeFileSync(
			`${output}/package.json`,
			JSON.stringify(solutionPkgConfig, null, 4)
		);

		if (includeDependencies) {
			shell.cp('-rf', 'node_modules/', `${output}`);
			child_process.execSync('npm prune --production', {
				cwd: path.resolve(`${output}`)
			});
		}

		// TODO Remove sync operations and and await by using promise based exec.
		child_process.execSync('rm -rf *', {
			cwd: path.resolve('../JS_deploy')
		});

		child_process.execSync('rm -rf .git', {
			cwd: path.resolve('../JS_deploy')
		});

		child_process.execSync('git init', {
			cwd: path.resolve('../JS_deploy')
		});

		child_process.execSync(
			'git remote add origin git@github.com:Sendhuraan/JS_deploy.git',
			{
				cwd: path.resolve('../JS_deploy')
			}
		);

		shell.cp('-rf', `${output}/*`, '../JS_deploy');

		child_process.execSync('git add .', {
			cwd: path.resolve('../JS_deploy')
		});

		child_process.execSync('git commit -m "Solution Deployment"', {
			cwd: path.resolve('../JS_deploy')
		});

		child_process.execSync('git push origin master -f', {
			cwd: path.resolve('../JS_deploy')
		});

		cb();
	}

	function validateSolution(cb) {
		var { deploy } = config;

		if (deploy) {
			cb(
				new Error(
					'DEPLOYMENT CONFIGURED FOR DEVELOPMENT. DISABLE CLOUD CONFIG TO PROCEED'
				)
			);
		} else {
			cb();
		}
	}

	function validateDeployment(cb) {
		var { deploy } = config;

		if (!deploy) {
			cb(new Error('DEPLOYMENT NOT CONFIGURED'));
		} else {
			cb();
		}
	}

	async function startOrCreateCloudInstances(cb) {
		var { deploy } = config;

		if (!deploy) {
			cb(new Error('DEPLOYMENT NOT CONFIGURED'));
		} else {
			var { start } = config.deploy.instances;
			var { create } = config.deploy.instances;

			if (start.length) {
				console.log('Instance Found');
				console.log('Starting required instance(s)');

				var startInstanceDetails = {
					InstanceIds: start
				};

				var startedInstanceDetails = await ec2_service
					.startInstances(startInstanceDetails)
					.promise();

				console.log(startedInstanceDetails);
			}

			if (create.length) {
				console.log('Instance not Found');
				console.log('Creating new instance');

				create.map(async function (instance) {
					var describeVpcs_Response = await ec2_service
						.describeVpcs()
						.promise();

					console.log(`VPC ID : ${describeVpcs_Response.Vpcs[0].VpcId}`);

					var paramsSecurityGroup = instance.securityGroup.metadata;
					paramsSecurityGroup.VpcId = describeVpcs_Response.Vpcs[0].VpcId;

					var createSecurityGroup_Response = await ec2_service
						.createSecurityGroup(paramsSecurityGroup)
						.promise();

					console.log(
						`Security Group (ID : ${createSecurityGroup_Response.GroupId}) Created!`
					);

					var paramsIngress = {
						GroupId: createSecurityGroup_Response.GroupId,
						IpPermissions: instance.securityGroup.parameters.IpPermissions
					};

					await ec2_service
						.authorizeSecurityGroupIngress(paramsIngress)
						.promise();

					console.log('Rules Added to Security Group');

					var instanceParams = instance.compute.parameters;

					instanceParams.SecurityGroupIds.push(
						createSecurityGroup_Response.GroupId
					);

					var ec2_instances = await ec2_service
						.runInstances(instanceParams)
						.promise();

					ec2_instances.Instances.map(function (instance) {
						console.log(`Instance (ID: ${instance.InstanceId}) Created`);
					});
				});
			}

			cb();
		}
	}

	async function executeCommands() {
		var { commands } = config.deploy;

		var commandsList = (function (nameList) {
			var commandNames = [];

			for (var name in nameList) {
				commandNames.push(name);
			}

			return commandNames;
		})(commands);

		var interactions = [
			{
				type: 'list',
				name: 'command_name',
				choices: commandsList,
				message: 'Select command to execute #'
			}
		];

		const userInput = await inquirer.prompt(interactions);

		var sendCommand_params = commands[userInput.command_name];

		try {
			var sendCommand_Response = await ssm_service
				.sendCommand(sendCommand_params)
				.promise();
		} catch (error) {
			console.log(error.message);
		} finally {
			if (sendCommand_Response) {
				console.log(
					`Command (ID : ${sendCommand_Response.Command.CommandId}) sent  successfully`
				);
			} else {
				console.log(
					'Command did not execute properly. Please check the parameters and try again'
				);
			}
		}
	}

	async function runCloudCommands() {
		await executeCommands();

		var interactions = [
			{
				type: 'input',
				name: 'reinitiate',
				message: 'Do you want to run another command (y/n) : '
			}
		];

		const userInput = await inquirer.prompt(interactions);

		if (userInput.reinitiate === 'y') {
			runCloudCommands();
			return;
		} else if (userInput.reinitiate === 'n') {
			console.log('Exiting Command Menu');
		} else {
			console.log('Please enter y for Yes / n for No');
		}
	}

	function transformFiles(cb) {
		var { test } = config.node;
		var { dir } = config.run;

		var { transpileFiles } = require('./build/utilities/transpile-runner');
		var { browser } = require('./build/config/babel.config.js');

		return src(test.pattern)
			.pipe(transpileFiles(browser))
			.pipe(dest(`${dir}/output`));

		cb();
	}

	const lint = parallel(lintNodeFiles);
	const bundle = series(bundleNode);
	const generateSolution = series(
		// lint,
		runNodeTests,
		cleanOutputDir,
		bundle,
		build
	);
	const generateDeployment = series(
		validateDeployment,
		generateSolution,
		createDeployment
	);
	const deploy = series(generateDeployment, runCloudCommands);

	// Preqs Group Tasks
	exports.deploymentPreqs = series(getConfig, startOrCreateCloudInstances);

	// Individual Tasks
	exports.lint = series(getConfig, lint);
	exports.lintNodeFiles = series(getConfig, lintNodeFiles);
	exports.runNodeTests = series(getConfig, lintNodeFiles, runNodeTests);
	exports.cleanOutputDir = series(getConfig, cleanOutputDir);
	exports.bundle = series(getConfig, bundle);
	exports.build = series(getConfig, build);
	exports.runSolution = series(getConfig, runSolution);
	exports.runCloudCommands = series(getConfig, runCloudCommands);

	// Temp Tasks
	exports.transformFiles = transformFiles;

	// Group Tasks
	exports.generateSolution = series(getConfig, generateSolution);
	exports.generateDeployment = series(getConfig, generateDeployment);
	exports.deploy = series(getConfig, deploy);

	// Meta Tasks
	exports.printConfig = series(getConfig, printConfig);

	// Default Task
	exports.default = series(
		getConfig,
		validateSolution,
		generateSolution,
		runSolution
	);
})();
