const superagent = require('superagent');
const fs = require('fs-extra');
const tempy = require('tempy');
const zipFile = require('is-zip-file');
const inquirer = require('inquirer');
const chalk = require('chalk');
const queryString = require('query-string');
const util = require('util');
const InvalidOperationError = require('../lib/util/invalidOperationError');

const sendFile = async (url, bucket, name, version, path, metadata, progress) => {
    return new Promise((resolve, reject) => {
        let request = superagent
            .put(`${url}/buckets/${bucket}/artifacts/${name}${(version ? `/${version} ` : '')}`)
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

const receiveFile = async (url, bucket, name, version, metadata, progress) => {
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
            .accept('application/zip')
            .maxResponseSize(10000000000);

        result.pipe(stream);

    });
};

const checkServer = async (url) => {
    return await superagent
        .get(`${url}/ping`)
        .set('accept', 'application/json');
};

class Progress {
    constructor() {
        this.ui = new inquirer.ui.BottomBar();
        this.loader = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.loaderTick = 4;
    }

    static now(unit) {

        const hrTime = process.hrtime();
        switch (unit) {
            case 'milli': return hrTime[0] * 1000 + hrTime[1] / 1000000;
            case 'micro': return hrTime[0] * 1000000 + hrTime[1] / 1000;
            case 'nano': return hrTime[0] * 1000000000 + hrTime[1];
            default: return hrTime[0] * 1000000000 + hrTime[1];
        }

    }

    start(text, indertermined = true) {
        if (indertermined) {
            this.interval = setInterval(() => {
                this.ui.updateBottomBar(this.loader[this.loaderTick++ % this.loader.length] + ' ' + text);
            }, 300);
        } else {
            this.ui.updateBottomBar(text);
            if (!process.stdout.isTTY) console.log(text);
        }
    }

    tick(text) {
        if (!this.lastUpdate || Progress.now('milli') - this.lastUpdate > 200) {
            this.ui.updateBottomBar(text);
            this.lastUpdate = Progress.now('milli');
        }
    }

    stop(text, leave = false) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.lastUpdate = null;
        if (!leave) this.ui.updateBottomBar('');
        else process.stdout.write('\n');
        process.stdout.write(text + '\n');
        if (!process.stdout.isTTY) console.log(text);
    }
}

module.exports = {
    put: async (url, bucket, name, version, path, metadata, quiet = false) => {
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
            const result = await sendFile(url, bucket, name, version, path, metadata, (event) => {
                let percentage = Math.floor((event.loaded * 100) / event.total);
                if (!quiet) progress.tick(`[${'▇'.repeat(percentage) + '-'.repeat(100 - percentage)}] ${percentage}% ` + chalk.blue('Sending file'));
            });
            if (!quiet) progress.stop(chalk.green('File sent!'));

            if (quiet) console.log(util.inspect(result.body, { colors: chalk.supportsColor.level == 0 || !chalk.enabled ? false : true }));

        } catch (ex) {
            progress.stop(chalk.red('ERROR'), true);
            throw ex;
        }
    },
    get: async (url, bucket, name, version, metadata, quiet = false) => {
        const progress = new Progress();

        try {
            // Test server connection
            if (!quiet) progress.start(chalk.blue('Contacting server'));
            await checkServer(url);
            if (!quiet) progress.stop(chalk.green('Connected to the server!'));

            if (!quiet) progress.start(chalk.blue('Receiving file'), false);
            const destinationFile = await receiveFile(url, bucket, name, version, metadata, (event) => {
                let percentage = Math.floor((event.loaded * 100) / event.total);
                if (!quiet) progress.tick(`[${'▇'.repeat(percentage) + '-'.repeat(100 - percentage)}] ${percentage}% ` + chalk.blue('Receiving file'));
            });
            if (!quiet) progress.stop(chalk.green('File received!'));
            if (quiet) console.log(destinationFile);

        } catch (ex) {
            progress.stop(chalk.red('ERROR'), true);
            throw ex;
        }
    }
};