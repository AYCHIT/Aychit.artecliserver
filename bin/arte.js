const path = require('path');
if (process.argv[1].includes('snapshot')) process.argv[1] = process.argv[1].replace('arte.js', path.relative(process.cwd(), process.argv0)); // Workaround that shows the correct file path inside the pkg generated file
const yargs = require('yargs');
const arteCli = require('./../lib/arte-cli');

const createCommandHandler = (func) => {
    return async (argv) => {
        try {
            await func(argv);
            process.exit(0);
        }
        catch (ex) {
            if (ex.toPrint) console.error(ex.toPrint());
            else console.error(ex.stack);
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
                describe: 'a .zip artifact'
            })
            .option('u', {
                alias: 'url',
                type: 'string',
                describe: 'arte server URL'
            })
            .option('v', {
                alias: 'version',
                type: 'string',
                describe: 'artifact version',
            })
            .option('b', {
                alias: 'bucket',
                type: 'string',
                describe: 'bucket name',
            })
            .option('n', {
                alias: 'name',
                type: 'string',
                describe: 'artifact name',
            })
            .option('m', {
                alias: 'metadata',
                type: 'string',
                describe: 'metadata',
            })
            .option('t', {
                alias: 'token',
                type: 'string',
                describe: 'authorization token'
            })
            .option('q', {                
                alias: 'quiet',
                type: 'boolean',
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
        const token = argv.token;
        const quiet = argv.quiet;

        if (metadata && typeof (metadata) == 'string') metadata = JSON.parse(metadata);

        return await arteCli.put(url, bucket, name, version, path, metadata, token, quiet);
    }))
    .command('get [options]', 'get an artifact', (yargs) => {
        return yargs
            .option('u', {
                alias: 'url',
                type: 'string',
                describe: 'arte server URL'
            })
            .option('v', {
                alias: 'version',
                type: 'string',
                describe: 'artifact version',
            })
            .option('b', {
                alias: 'bucket',
                type: 'string',
                describe: 'bucket name',
            })
            .option('n', {
                alias: 'name',
                type: 'string',
                describe: 'artifact name',
            })
            .option('m', {
                alias: 'metadata',
                type: 'string',
                describe: 'metadata',
            })
            .option('t', {
                alias: 'token',
                type: 'string',
                describe: 'authorization token'
            })
            .option('q', {                
                alias: 'quiet',
                type: 'boolean',
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
        const token = argv.token;
        const quiet = argv.quiet;

        if (metadata && typeof (metadata) == 'string') metadata = JSON.parse(metadata);

        return await arteCli.get(url, bucket, name, version, metadata, token, quiet);
    }))
    .command('search [options]', 'search for artifacts', (yargs) => {
        return yargs
            .option('u', {
                alias: 'url',
                type: 'string',
                describe: 'arte server URL'
            })
            .option('v', {
                alias: 'version',
                type: 'string',
                describe: 'artifact version',
            })
            .option('b', {
                alias: 'bucket',
                type: 'string',
                describe: 'bucket name',
            })
            .option('n', {
                alias: 'name',
                type: 'string',
                describe: 'artifact name',
            })
            .option('m', {
                alias: 'metadata',
                type: 'string',
                describe: 'metadata',
            })
            .option('t', {
                alias: 'token',
                type: 'string',
                describe: 'authorization token'
            })
            .option('e', {                
                alias: 'exact-match',
                type: 'boolean',
                describe: 'Bucket and name must be exact matches',
            })
            .version(false);
    }, createCommandHandler(async (argv) => {
        const url = argv.url || 'http://localhost:80';
        const bucket = argv.bucket;
        const name = argv.name;
        const version = argv.version;
        const token = argv.token;
        const exactMatch = argv.exactMatch || false;
        let metadata = argv.metadata;

        if (metadata && typeof (metadata) == 'string') metadata = JSON.parse(metadata);

        return await arteCli.search(url, bucket, name, version, metadata, token, exactMatch);
    }))
    .command('delete [options]', 'delete artifacts', (yargs) => {
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
            .option('t', {
                alias: 'token',
                type: 'string',
                describe: 'authorization token'
            })
            .option('f', {
                type: 'boolean',
                alias: 'force',
                describe: 'Force deletion (no asking is done)'
            })
            .version(false)
            .demand(['b', 'n']);
    }, createCommandHandler(async (argv) => {
        const url = argv.url || 'http://localhost:80';
        const bucket = argv.bucket;
        const name = argv.name;
        const version = argv.version;
        let metadata = argv.metadata;
        const token = argv.token;
        const force = argv.force;

        if (metadata && typeof (metadata) == 'string') metadata = JSON.parse(metadata);

        return await arteCli.delete(url, bucket, name, version, metadata, token, force);
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

// TODO: Add feature that allows the creation of a bucket and its configuration