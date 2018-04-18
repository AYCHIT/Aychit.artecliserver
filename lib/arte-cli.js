const superagent = require('superagent');
const fs = require('fs-extra');
const tempy = require('tempy');
const zipFile = require('is-zip-file');
const chalk = require('chalk');
const queryString = require('query-string');
const util = require('util');
const InvalidOperationError = require('../lib/util/invalidOperationError');
const Progress = require('./util/progress');
const filesize = require('filesize');
const inquirer = require('inquirer');
const moment = require('moment');
require('moment-precise-range-plugin');

// TODO: Rename this to artifact
const sendFile = async (url, bucket, name, version, path, metadata, token, progress) => {
    return new Promise((resolve, reject) => {
        let request = superagent
            .put(`${url}/buckets/${bucket}/artifacts/${name}${(version ? `/${version} ` : '')}`)
            .set((token ? { Authorization: token } : null))
            .attach('artifact', path)
            .on('progress', progress);

        if (metadata) request = request.field(metadata);

        request
            .on('error', reject)
            .end((err, result) => {
                resolve(result);
            });
    });
};

// TODO: Rename this to artifact
const receiveFile = async (url, bucket, name, version, metadata, token, progress) => {
    return new Promise((resolve, reject) => {
        const tempFileName = tempy.file();
        const stream = fs.createWriteStream(tempFileName);
        let destinationFileName = null;
        let body = '';

        const event = {
            loaded: 0,
            total: 0
        };

        stream.on('pipe', stream => {
            try {
                if (stream.statusCode == 200) {
                    event.total = parseInt(stream.headers['content-length'], 10);
                    destinationFileName = stream.headers['content-disposition'].match(/filename="(.*?)"/)[1];
                    stream.on('data', chunk => {
                        event.loaded += chunk.length;
                        progress(event);
                    });
                } else {
                    stream.on('data', chunk => {
                        body += chunk;
                    });
                }
            } catch (ex) {
                reject(ex);
            }
        });

        stream.on('error', err => {
            if (err) reject(err);
        });

        stream.on('unpipe', res => {
            try {
                if (res.statusCode == 200) {
                    if (res.complete) {
                        fs.moveSync(tempFileName, destinationFileName, { overwrite: true });
                        resolve(destinationFileName);
                    } else {
                        if (fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName);
                        reject('Connection reseted');
                    }
                } else {
                    const jsonBody = JSON.parse(body);
                    throw jsonBody;
                }
            } catch (ex) {
                reject(ex);
            }
        });

        let result = superagent
            .get(`${url}/buckets/${bucket}/artifacts/${name}/${(version ? version : 'latest')}${metadata ? '?' + queryString.stringify(metadata) : ''}`)
            .set((token ? { Authorization: token } : null))
            .accept('application/zip')
            .maxResponseSize(10000000000);

        result.pipe(stream);

    });
};

const search = async (url, bucket, artifact, version, metadata, token, exactMatch) => {
    try {
        let url = `/artifacts/search?&partial=${!exactMatch}`;

        if (bucket) url += '&bucket=' + bucket;
        if (artifact) url += '&artifact=' + artifact;
        if (version) url += '&version=' + version;
        if (metadata) url += '&' + metadata.replace(/,/g, '&');

        const result = await superagent
            .get(url)
            .set((token ? { Authorization: token } : null))
            .accept('application/json');

        if (result.body && Array.isArray(result.body)) return result.body;
        else return [];
    } catch (ex) {
        if (ex.status == 404) return [];
        else throw ex;
    }
};

// TODO: Rename this to artifact
const deleteArtifacts = async (url, bucket, name, version, metadata, token) => {
    try {
        const result = await superagent
            .delete(`${url}/buckets/${bucket}/artifacts/${name}/${(version ? version : '')}${metadata ? '?' + queryString.stringify(metadata) : ''}`)
            .set((token ? { Authorization: token } : null))
            .accept('application/json');
        if (result.body && Array.isArray(result.body)) return result.body;
        else return [];
    } catch (ex) {
        if (ex.status == 404) return [];
        else throw ex;
    }
};

const checkServer = async (url) => {
    try {
        return await superagent
            .get(`${url}/ping`)
            .set('accept', 'application/json');
    } catch (ex) {
        throw new Error(`Cannot connect to ${url}`);
    }
};

module.exports = {
    put: async (url, bucket, name, version, path, metadata, token, quiet = false) => {
        const progress = new Progress();
        try {

            // Check if path is a valid zip file
            if (!quiet) progress.start(chalk.blue('Checking file'));
            const stats = await fs.stat(path);
            if (!stats.isFile()) throw new InvalidOperationError(`The path '${path}' must be a file`);
            else if (!zipFile.isZipSync(path)) throw new InvalidOperationError(`The file '${path}' must be a zip`);
            if (!quiet) progress.stop(chalk.green('File checked!'));

            // Test server connection
            if (!quiet) progress.start(chalk.blue('Contacting server'));
            await checkServer(url);
            if (!quiet) progress.stop(chalk.green('Connected to the server!'));

            // Send file            
            if (!quiet) progress.start('Sending file', false);
            const start = new moment();
            const result = await sendFile(url, bucket, name, version, path, metadata, token, (event) => {
                let percentage = Math.floor((event.loaded * 100) / event.total);
                if (!quiet) progress.tick(`[${'▇'.repeat(percentage) + '-'.repeat(100 - percentage)}] ${percentage}% ` + chalk.blue('Sending file'));
            });
            const end = new moment();
            if (!quiet) progress.stop(chalk.green(`File sent in ${moment.preciseDiff(start, end) || '0 seconds'}!`));

            if (quiet) console.log(util.inspect(result.body, { colors: chalk.supportsColor.level == 0 || !chalk.enabled ? false : true }));

        } catch (ex) {
            progress.stop(chalk.red('ERROR'), true);
            throw ex;
        }
    },
    get: async (url, bucket, name, version, metadata, token, quiet = false) => {
        const progress = new Progress();

        try {
            // Test server connection
            if (!quiet) progress.start(chalk.blue('Contacting server'));
            await checkServer(url);
            if (!quiet) progress.stop(chalk.green('Connected to the server!'));

            if (!quiet) progress.start(chalk.blue('Receiving file'), false);
            const start = new moment();
            const destinationFile = await receiveFile(url, bucket, name, version, metadata, token, (event) => {
                let percentage = Math.floor((event.loaded * 100) / event.total);
                if (!quiet) progress.tick(`[${'▇'.repeat(percentage) + '-'.repeat(100 - percentage)}] ${percentage}% ` + chalk.blue('Receiving file'));
            });
            const end = new moment();
            if (!quiet) progress.stop(chalk.green(`File received in ${moment.preciseDiff(start, end) || '0 seconds'}!`));
            if (quiet) console.log(destinationFile);

        } catch (ex) {
            progress.stop(chalk.red('ERROR'), true);
            throw ex;
        }
    },
    search: async (url, bucket, name, version, metadata, token, exactMatch) => {
        const progress = new Progress();

        try {
            // Test server connection
            progress.start(chalk.blue('Contacting server'));
            await checkServer(url);
            progress.stop(chalk.green('Connected to the server!'));

            // Search for artifacts
            progress.start(chalk.blue('Searching artifacts'));
            const artifacts = await search(url, bucket, name, version, metadata, token, exactMatch);
            progress.stop(chalk.green(`Found ${artifacts.length} artifact(s)!`));
            if (artifacts.length > 0) console.log(createArtifactsTable(artifacts));

        } catch (ex) {
            progress.stop(chalk.red('ERROR'), true);
            throw ex;
        }
    },
    delete: async (url, bucket, name, version, metadata, token, force = false) => {
        const progress = new Progress();

        try {
            // Test server connection
            progress.start(chalk.blue('Contacting server'));
            await checkServer(url);
            progress.stop(chalk.green('Connected to the server!'));

            // Search for artifacts
            progress.start(chalk.blue('Searching artifacts'));
            const artifacts = await search(url, bucket, name, version, metadata, token);
            progress.stop(chalk.green(`Found ${artifacts.length} artifact(s)!`));
            if (artifacts.length > 0) {
                console.log(createArtifactsTable(artifacts));

                let shouldDelete = force;

                if (!shouldDelete) {
                    const result = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'shouldDelete',
                        message: 'Are you sure to delete these artifacts?',
                        default: false
                    }]);

                    shouldDelete = result.shouldDelete;
                }

                // Delete the artifacts
                if (shouldDelete) {
                    progress.start(chalk.blue('Deleting artifacts'));
                    const deletedArtifacts = await deleteArtifacts(url, bucket, name, version, metadata);
                    progress.stop(chalk.green(`Deleted ${deletedArtifacts.length} artifact(s)!`));
                } else {
                    progress.stop(chalk.red('No artifact deleted!'));
                }
            }
        } catch (ex) {
            progress.stop(chalk.red('ERROR'), true);
            throw ex;
        }
    }
};

const createArtifactsTable = (artifacts) => {
    return createTable({
        bucket: { title: 'BUCKET' },
        name: { title: 'NAME' },
        version: { title: 'VERSION' },
        normalizedVersion: { title: 'NORMALIZED VERSION' },
        path: { title: 'PATH' },
        fileSize: { title: 'FILE SIZE', formatter: filesize },
        lastUpdate: { title: 'LAST UPDATE', formatter: date => moment(date).fromNow() },
        metadata: { title: 'METADATA', formatter: date => util.inspect(date, { breakLength: Infinity, colors: chalk.supportsColor.level == 0 || !chalk.enabled ? false : true }) }
    }, artifacts);
};

const createTable = (columnsFormat, items) => {
    let result = '';

    // Calculate max size per column    
    const columnsObject = {};
    Object.keys(columnsFormat).map(item => {
        const stringifiedItem = columnsFormat[item].title || item;
        if (!columnsObject[item]) columnsObject[item] = 10;
        columnsObject[item] = Math.max(stringifiedItem.length, columnsObject[item]);
    });

    items.forEach(row => {
        Object.keys(row).map((column) => {
            const stringifiedItem = columnsFormat[column].formatter ? columnsFormat[column].formatter(row[column]) : row[column];
            columnsObject[column] = columnsObject[column] = Math.max(stringifiedItem.length, columnsObject[column]);
        });
    });

    // Build the header
    Object.keys(columnsFormat).map(item => {
        const stringifiedItem = columnsFormat[item].title || item;
        result += stringifiedItem.substring(0, columnsObject[item]).padEnd(columnsObject[item], ' ') + ' ';
    });

    result += '\n';

    // Build rows
    items.forEach((row, index) => {
        Object.keys(row).map((column) => {
            const stringifiedItem = columnsFormat[column].formatter ? columnsFormat[column].formatter(row[column]) : row[column];
            result += stringifiedItem.substring(0, columnsObject[column]).padEnd(columnsObject[column], ' ') + ' ';
        });
        if (index != items.length - 1)
            result += '\n';
    });

    return result;
};