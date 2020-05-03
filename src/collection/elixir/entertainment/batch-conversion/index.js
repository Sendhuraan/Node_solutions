'use strict';

(async function () {
	var fs = require('fs');
	var path = require('path');
	var util = require('util');

	var ffmpeg = require('fluent-ffmpeg');
	const { MongoClient, ObjectID } = require('mongodb');

	const readFile = util.promisify(fs.readFile);
	const readDirectory = util.promisify(fs.readdir);

	const configEnv = './env.json';
	const configPath = path.join(__dirname, configEnv);
	const appConfig = JSON.parse(await readFile(configPath));

	const { connectionURL } = appConfig.db;
	const DB_NAME = appConfig.db.name;
	const videoBasePath = 'D:\\MSOCACHE';
	const rawDataFolder = '_raw-data';
	const databaseFolder = '_database';

	function getMediaDetails(mediaPath) {
		return new Promise(function (resolve, reject) {
			ffmpeg.ffprobe(mediaPath, function (err, metadata) {
				if (err) {
					reject(err);
				} else {
					resolve(metadata);
				}
			});
		});
	}

	try {
		const videoFiles = await readDirectory(
			path.join(videoBasePath, rawDataFolder)
		);

		console.log(videoFiles);

		const videoFilesPromises = videoFiles.map(function (videoFile) {
			let videoFilePath = path.join(videoBasePath, rawDataFolder, videoFile);

			return getMediaDetails(videoFilePath);
		});

		const videoFilesDetails = await Promise.all(videoFilesPromises);

		const videoFilesSchema = videoFilesDetails.map(function (fileDetail) {
			let oldFilePath = fileDetail.format.filename;
			let newFileId = new ObjectID();
			let newFileExtension = fileDetail.format.filename.split('.').pop();
			let newFileName = `${newFileId}.${newFileExtension}`;
			let newFilePath = path.join(videoBasePath, databaseFolder, newFileName);

			fs.renameSync(oldFilePath, newFilePath);

			const filename = fileDetail.format.filename.replace(
				'D:\\MSOCACHE\\_raw-data\\',
				''
			);

			console.log(filename);

			const mediaSchema = {
				_id: newFileId,
				name: `wtf - ${filename}`,
				width: fileDetail.streams[0].width,
				height: fileDetail.streams[0].height,
				size: fileDetail.format.size,
				extension: fileDetail.format.filename.split('.').pop()
			};

			return mediaSchema;
		});

		console.log(videoFilesSchema);

		var client = await MongoClient.connect(connectionURL, {
			useNewUrlParser: true
		});

		console.log('Connected to DB successfully');

		const db = client.db(DB_NAME);

		// var results_findAll = await db.collection('pornstar').find({}).toArray();
		// console.log(results_findAll);

		if (videoFilesSchema.length) {
			await db.collection('media').insertMany(videoFilesSchema);
		}

		// console.log('Inserted one document successfully');
	} catch (err) {
		console.error(err);
	} finally {
		await client.close();
		console.log('Connection to DB closed');
	}
})();
