import * as ts from 'typescript';
import { determineBaseDirectory } from './utils/baseDir';
import { errors } from './errors';
import { ValidationTransformer } from './validationTransformer';

function isTransformable(filename: string): boolean {
    return (
        !filename.endsWith('.d.ts') &&
        (filename.endsWith('.ts') || filename.endsWith('.tsx'))
    );
}

export default function transformer(program: ts.Program /*, config: Config*/) {
    const filesToTransform = program
        .getSourceFiles()
        .map(sourceFile => sourceFile.fileName)
        .filter(isTransformable);

    const baseDir = determineBaseDirectory(program);

    let filesRemaining = filesToTransform.length;
    const transformer = new ValidationTransformer(
        program,
        baseDir || program.getCurrentDirectory(),
    );

    return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
        const finalNode = transformer.visitNodeAndChildren(file, context);
        filesRemaining -= 1;

        if (filesRemaining === 0) {
            if (errors.length) {
                const lines = errors.map(
                    ({ message, file, line, character }) =>
                        `Error [runtime-check transform]: ${message}. This error occured in ${file}, Line: ${line}:${character}`,
                );

                throw new Error(lines.join('\n'));
            } else {
                transformer.dumpSchemas();
            }
        }

        return finalNode;
    };
}
