import * as path from 'path';
import * as ts from 'typescript';
import { assertExists } from './assert';
import pjson from 'pjson';

// TODO: Unit test this
function commonRoot(dirA: string, dirB: string) {
    const partsA = dirA.split(path.sep);
    const partsB = dirB.split(path.sep);

    const minPart = Math.min(partsA.length, partsB.length);

    let partCount;
    for (partCount = 0; partCount < minPart; partCount += 1) {
        if (partsA[partCount] !== partsB[partCount]) {
            break;
        }
    }

    return partsA.slice(0, partCount).join(path.sep);
}

// TODO: Add tests for this
// TODO: Test interaction with baseUrl
// TODO: Add docs
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
                    baseDir = commonRoot(baseDir, dir);
                }
            });
    }

    return assertExists(
        baseDir,
        `${pjson.name} should have determine base dir.  Do you have any TS files?`,
    );
}
