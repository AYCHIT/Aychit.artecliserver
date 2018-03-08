const yargs = require('yargs');
const fs = require('fs-extra');
const chalk = require('chalk');
const util = require('util');
const arteCli = require('./../lib/arte-cli');

// arte put file.zip -b bucket -n name -u http://localhost/ --metadata.arch=x86 --auth xyz
// arte get -b bucket -n name --version 1.0 --metadata.arch x86 --auth xyz
// arte get -b bucket -n name --latest --metadata.arch=x86 --auth xyz

const createCommandHandler = (func) => {
    return async (argv) => {
        try {
            await func(argv);
            process.exit(0);
        }
        catch (ex) {
            console.error(ex.message);
            if (argv.verbose) console.error(util.inspect(ex, { colors: true }));
            process.exit(1);
        }
    };
};

// TODO: Add examples
yargs
    .command('put <path> [options]', 'put an artifact', (yargs) => {
        return yargs
            .positional('path', {
                alias: 'folder',
                describe: 'an .zip artifact or a path that will be compressed to .zip artifact'
            })
            .option('u', {
                alias: 'url',
                describe: 'arte server URL'
            })
            .option('v', {
                alias: 'version',
                describe: 'artifact version',
            })
            .option('b', {
                alias: 'bucket',
                describe: 'bucket name',
            })
            .option('n', {
                alias: 'name',
                describe: 'artifact name',
            })
            .option('m', {
                alias: 'metadata',
                describe: 'metadata',
            })
            .version(false)
            .demand(['u', 'b', 'n']);
    }, createCommandHandler(async (argv) => {
        const url = argv.url;
        const bucket = argv.bucket;
        const name = argv.name;
        const version = argv.version;
        const path = argv.path;
        let metadata = argv.metadata;

        if (metadata && typeof (metadata) == 'string') metadata = JSON.parse(metadata);

        return await arteCli.put(url, bucket, name, version, path, metadata);
    }))
    .command('get [options]', 'get an artifact', (yargs) => {
        return yargs
            .option('u', {
                alias: 'url',
                describe: 'arte server URL'
            })
            .option('v', {
                alias: 'version',
                describe: 'artifact version',
            })
            .option('b', {
                alias: 'bucket',
                describe: 'bucket name',
            })
            .option('n', {
                alias: 'name',
                describe: 'artifact name',
            })
            .option('m', {                
                alias: 'metadata',
                describe: 'metadata',
            })
            .option('q', {
                type: 'boolean',
                alias: 'quiet',
                description: 'Only display filename'
            })
            .version(false)
            .demand(['u', 'b', 'n']);
    }, createCommandHandler(async (argv) => {
        const url = argv.url;
        const bucket = argv.bucket;
        const name = argv.name;
        const version = argv.version;
        let metadata = argv.metadata;
        const quiet = argv.quiet;

        if (metadata && typeof (metadata) == 'string') metadata = JSON.parse(metadata);

        return await arteCli.get(url, bucket, name, version, metadata, quiet);
    }))
    .demandCommand(1)
    .version()
    .option('verbose', {
        type: 'boolean',
        description: 'Display detailed information'
    })
    .option('no-color', {
        type: 'boolean',
        description: 'Force disabling of color'
    })
    .help('h')
    .alias('h', 'help')
    .argv;