import * as path from 'path';
import * as ts from 'typescript';
import { assertExists } from './assert';
import pjson from 'pjson';

const SEPARATOR_REGEX = new RegExp(`/\\${path.sep}/`, 'g');
function countSeparators(fullPath: string): number {
    return (fullPath.match(SEPARATOR_REGEX) || []).length;
}

// TODO: Add tests for this
// TODO: Test interaction with baseUrl
export function determineBaseDirectory(program: ts.Program): string {
    const { baseUrl } = program.getCompilerOptions();

    if (baseUrl) {
        return path.normalize(
            path.join(program.getCurrentDirectory(), baseUrl),
        );
    }

    let baseDir: string | undefined;

    if (!baseDir) {
        program
            .getSourceFiles()
            .filter(value => {
                return (
                    !value.fileName.endsWith('.d.ts') &&
                    !value.fileName.match(/.*\/node_modules\/.*/)
                );
            })
            .forEach(value => {
                const dir = path.resolve(
                    path.normalize(path.dirname(value.fileName)),
                );

                if (!baseDir) {
                    baseDir = dir;
                } else {
                    // TODO: Not sure this logic holds if importing outside of
                    // normal directory structure (e.g. ../../.. behind the tsconfig)
                    if (countSeparators(dir) < countSeparators(baseDir)) {
                        baseDir = dir;
                    }
                }
            });
    }

    return assertExists(
        baseDir,
        `${pjson.name} should have determine base dir.  Do you have any TS files?`,
    );
}
