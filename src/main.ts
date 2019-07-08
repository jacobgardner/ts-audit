import * as ts from 'typescript';
import { determineBaseDirectory } from './utils/baseDir';
import { errors } from './errors';
import { ValidationVisitor } from './validationVisitor';

function isTransformable(filename: string): boolean {
    return (
        !filename.endsWith('.d.ts') &&
        (filename.endsWith('.ts') || filename.endsWith('.tsx'))
    );
}

/*
    This is the function signature that typescript is expecting for transforms.
    If we ever add plugin configuration, it'll be the second parameter.
 */
export default function transformer(program: ts.Program /*, config: Config*/) {
    const baseDir = determineBaseDirectory(program);
    const filesToTransform = program
        .getSourceFiles()
        .map(sourceFile => sourceFile.fileName)
        .filter(isTransformable);

    let filesRemaining = filesToTransform.length;
    const transformer = new ValidationVisitor(
        program,
        baseDir || program.getCurrentDirectory(),
    );

    return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
        const finalNode = transformer.visitNodeAndChildren(file, context);
        filesRemaining -= 1;

        if (filesRemaining === 0) {
            // TODO: Move at least some of this into errors.ts
            if (errors.length) {
                const lines = errors.map(
                    ({ message, file, line, character }) =>
                        `Error [runtime-check transform]: ${message}. This error occured in ${file}:${line}:${character}`,
                );

                throw new Error(lines.join('\n'));
            } else {
                transformer.writeRuntimeValidatorToFile();
            }
        }

        return finalNode;
    };
}
