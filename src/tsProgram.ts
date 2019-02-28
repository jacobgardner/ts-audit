import * as fs from 'fs';
import * as ts from 'typescript';

const host = ts.createCompilerHost({});
if (!host || !host.readDirectory) {
    throw new Error();
}

class ParseConfigHost implements ts.ParseConfigHost {
    useCaseSensitiveFileNames = true;

    readDirectory(
        rootDir: string,
        extensions: ReadonlyArray<string>,
        excludes: ReadonlyArray<string> | undefined,
        includes: ReadonlyArray<string>,
        depth?: number
    ): ReadonlyArray<string> {
        // TODO: Replace with not hot garbage
        if (host.readDirectory) {
            return host.readDirectory(rootDir, extensions, excludes, includes, depth);
        } else {
            throw new Error();
        }
    }

    fileExists(path: string) {
        console.log(path);
        return true;
    }

    readFile(path: string) {
        return fs.readFileSync(path).toString();
    }
}

export function getProgramFromConfig(path = 'tsconfig.json') {
    const options = ts.readConfigFile('tsconfig.json', host.readFile);

    if (options.error) {
        throw options.error;
    }

    const config = ts.parseJsonConfigFileContent(options.config, new ParseConfigHost(), '.');
    return ts.createProgram(config.fileNames, config.options);
}
