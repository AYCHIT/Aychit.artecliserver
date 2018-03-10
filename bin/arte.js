const path = require('path');
if (process.argv[1].includes('snapshot')) process.argv[1] = process.argv[1].replace('arte.js', path.relative(process.cwd(), process.argv0));
const yargs = require('yargs');
const util = require('util');
const chalk = require('chalk');
const arteCli = require('./../lib/arte-cli');

const createCommandHandler = (func) => {
    return async (argv) => {
        try {
            await func(argv);
            process.exit(0);
        }
        catch (ex) {
            console.error(ex.message);
            if (argv.verbose) console.error(util.inspect(ex, { colors: chalk.supportsColor.level == 0 || !chalk.enabled ? false : true }));
            process.exit(1);
        }
    };
};

yargs
    .example('$0 put file.zip -b bucket1 -n the-artifact --metadata.arch=x86 -u http://localhost/', 'send file.zip as the-artifact with metadata arch=x86 to bucket1.')
    .example('$0 get -b bucket1 -n the-artifact --version latest --metadata.arch=x86 -u http://localhost/', 'get the latest artifact with the name the-artifact and metadata arch=x86 from bucket1.')
    .example('$0 get -b bucket1 -n the-artifact --version 1.0 --metadata.arch=x86 -u http://localhost/', 'get version 1.0 of the artifact with name the-artifact and metadata arch=x86 from bucket1.')
    .example('$0 get -b bucket1 -n the-artifact --version 1.0 --metadata.cutomVersion=latest -u http://localhost/', 'get latest customVersion of version 1.0 of the artifact with name the-artifact from bucket1.')
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
            .option('q', {
                type: 'boolean',
                alias: 'quiet',
                description: 'Only display artifact data'
            })
            .version(false)
            .demand(['b', 'n']);
    }, createCommandHandler(async (argv) => {
        const url = argv.url || 'http://localhost:80';
        const bucket = argv.bucket;
        const name = argv.name;
        const version = argv.version;
        const path = argv.path;
        let metadata = argv.metadata;
        const quiet = argv.quiet;

        if (metadata && typeof (metadata) == 'string') metadata = JSON.parse(metadata);

        return await arteCli.put(url, bucket, name, version, path, metadata, quiet);
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
            .demand(['b', 'n']);
    }, createCommandHandler(async (argv) => {
        const url = argv.url || 'http://localhost:80';
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
    .wrap(yargs.terminalWidth())
    .argv;