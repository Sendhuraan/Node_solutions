'use strict';

(function() {

	var environments = {
		workstation: {
			instance: {
				parameters: {
					server: {
						port: 3000,
						render: false
					},
					db: {
						protocol: 'mongodb://',
						// optional
						username: 'local',
						// optional
						password: 'pass',
						port: 27017,
						name: 'mongodb-cookbook-examples_01_inserting-records_users'
					}
				},
				config: {
					type: 'workstation'
				}
			}
		},
		cloud: {
			enabled: false,
			includeDependencies: false,
			metadata: {
				name: 'config-test'
			},
			mode: 'production',
			parameters: {
				server: {
					port: 'ssm:/Server/Stage/Port'
				},
				db: {
					protocol: 'mongodb://',
					username: 'ssm:/DB/Mongo/Stage/Username',
					password: 'ssm:/DB/Mongo/Stage/Password',
					port: 'ssm:/DB/Mongo/Stage/Port',
					name: 'mongodb-cookbook-examples_01_inserting-records_users'
				}
			},
			instances: [
				{
					setup: {
						securityGroup: {
							metadata: {
								Description: 'Security Group for JS_solutions Server',
								GroupName: 'JS_solutions_server_security-group'
							},
							parameters: {
								IpPermissions:[
									{
										IpProtocol: 'tcp',
										FromPort: 49156,
										ToPort: 49156,
										IpRanges: [
											{
												'CidrIp': '0.0.0.0/0'
											}
										]
									},
									{
										IpProtocol: 'tcp',
										FromPort: 22,
										ToPort: 22,
										IpRanges: [
											{
												'CidrIp': '0.0.0.0/0'
											}
										]
									}
								]
							}
						},
						compute: {
							parameters: {
								ImageId: 'ami-0889b8a448de4fc44', 
								InstanceType: 't2.micro',
								KeyName: 'Sendhuraan-key-pair-ap-mumbai',
								MinCount: 1,
								MaxCount: 1,
								SecurityGroupIds: [],
								IamInstanceProfile: {
									Name: 'JS_solutions_admin'
								},
								TagSpecifications: [
									{
										ResourceType: 'instance',
										Tags: [
											{
												Key: 'Name',
												Value: 'Node JS App Server'
											},
											{
												Key: 'Environment',
												Value: 'Stage'
											}		
										]
									}
								]
							}
						}
					},
					commands: {
						configureInstance: {
							documentType: 'AWS-RunShellScript',
							commands: [
								'yum install -y gcc-c++ make',
								'curl -sL https://rpm.nodesource.com/setup_8.x | bash -',
								'yum install nodejs -y',
								'yum install git -y',
								'npm install pm2 -g'
							]
						},
						pushToInstance: {
							documentType: 'AWS-RunShellScript',
							commands: [
								'cd /var',
								'mkdir www',
								'cd www',
								'mkdir JS_app',
								'chmod o+rwx JS_app',
								'cd JS_app',
								'git clone https://github.com/Sendhuraan/JS_deploy.git .',
								'npm install'
							]
						},
						createAppEnvironment: {
							inject: true,
							documentType: 'AWS-RunShellScript',
							commands: [
								'cd /var/www/JS_app',
								'touch env.json',
								'APP_PARAMS=calc:{env}',
								'echo $APP_PARAMS > env.json'
							]
						},
						startAppServer: {
							documentType: 'AWS-RunShellScript',
							commands: [
								'cd /var/www/JS_app',
								'npm start'
							]
						},
						stopAppServer: {
							documentType: 'AWS-RunShellScript',
							commands: [
								'cd /var/www/JS_app',
								'npm stop'
							]
						}
					},
					config: {
						type: 'server',
						service: 'aws',
						filters: [
							{
								Name: 'tag:Name',
								Values: [
									'Node JS App Server'
								]
							},
							{
								Name: 'tag:Environment',
								Values: [
									'Stage'
								]
							}
						]
					}
				}
			]
		}
	};

	var publicAPI = {
		environments
	};

	module.exports = publicAPI;
	
})();
