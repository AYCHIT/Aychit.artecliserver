![logo][logo] Arte-cli
====
_A CLI for the arte-server artifact server_

[![Node.js version support][shield-node]](#)
[![MIT licensed][shield-license]](LICENSE.md)

Summary
----

1. [Description](#description)
2. [Technology and Requirements](#technology-and-requirements)
3. [Getting Started](#getting-started)
4. [Contributing](#contributing)
5. [Support and Migration](#support-and-migration)
6. [Code of Conduct](#code-of-conduct)
7. [License](#license)

Description
----

The Arte CLI is a simple command-line utility to search, upload and download artifacts from the arte-server.

Below a list of planned features:
- Authentication/authorization (using tokens);
- Retention policy;

Usage:
```bash
arte.js <command>

Commands:
  arte.js put <path> [options]  put an artifact
  arte.js get [options]         get an artifact
  arte.js search [options]      search for artifacts
  arte.js delete [options]      delete artifacts

Options:
  --version   Show version number [boolean]  
  --verbose   Display detailed information [boolean]  
  --no-color  Force disabling of color [boolean]  
  -h, --help  Show help [boolean]

Examples:
  arte.js put file.zip -b bucket1 -n the-artifact --metadata.arch=x86 -u http://localhost/                  send file.zip as the-artifact with metadata arch=x86 to bucket1.
  arte.js get -b bucket1 -n the-artifact --version latest --metadata.arch=x86 -u http://localhost/          get the latest artifact with the name the-artifact and metadata arch=x86 from bucket1.
  arte.js get -b bucket1 -n the-artifact --version 1.0 --metadata.arch=x86 -u http://localhost/             get version 1.0 of the artifact with name the-artifact and metadata arch=x86 from bucket1.
  arte.js get -b bucket1 -n the-artifact --version 1.0 --metadata.cutomVersion=latest -u http://localhost/  get latest customVersion of version 1.0 of the artifact with name the-artifact from bucket1.
```

```bash
arte.js put <path> [options]

put an artifact

Positionals:
  path, folder  a .zip artifact [required]

Options:
  --verbose       Display detailed information [boolean]  
  --no-color      Force disabling of color [boolean]  
  -h, --help      Show help [boolean]  
  -u, --url       arte server URL
  -v, --version   artifact version
  -b, --bucket    bucket name [required]  
  -n, --name      artifact name [required]  
  -m, --metadata  metadata
  -q, --quiet     Only display artifact data [boolean]
```

Screenshot:
![CLI][CLI]

Technology and Requirements
----

This project uses the following stack:

- [Node.js](https://nodejs.org) for the CLI;
- [PKG](https://github.com/zeit/pkg) for packing the node application into an executable.


Getting Started
----

Local:

```bash
# Clone the repository
$ git clone https://github.com/conradoqg/arte-cli.git

# Run the arte-cli
$ cd arte-cli
$ node ./bin/arte.js
```

Binary
```bash
# Download the binary (choose one of the available OSs, check the release page)
$ curl https://github.com/conradoqg/arte-cli/releases/download/v1.0/arte-cli-linux -L -o arte

# Run the binary
$ ./arte search
```

Contributing
----

Check the [contributing guide](CONTRIBUTING.md) to see more information.

Support and Migration
----

This is a beta CLI, there is no support right now until it becomes stable. Expect breaking changes on every commit.

Code of Conduct
----

Check the [code of conduct](CODE_OF_CONDUCT.md) to see more information.

License
----
This project is licensed under the [MIT](LICENSE.md) License.

[logo]: public/arte-cli32x32.png "Arte-server"
[CLI]: public/CLI.png
[shield-license]: https://img.shields.io/badge/license-MIT-blue.svg
[shield-node]: https://img.shields.io/badge/node.js%20support-8.8.1-brightgreen.svg