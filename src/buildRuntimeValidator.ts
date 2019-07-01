import * as path from 'path';
import * as ts from 'typescript';
import { generateAssertIsTypeFn } from './astGenerators/assertIsType';
import { generateIsTypeFn } from './astGenerators/isType';
import { generateSchemaBoilerplate } from './astGenerators/schemaBoilerplate';
import { generateValidationError } from './astGenerators/validationError';
import pjson from 'pjson';
import { SchemaDefinitions } from './schemaDB';
import { VALIDATIONS_GENERATED_FILENAME } from './config';

function generateSourceFileFromSchemaDefinitions(
    validationsPath: string,
    scriptTarget: ts.ScriptTarget,
    schemaDefinitions: SchemaDefinitions,
): ts.SourceFile {
    const sourceFile = ts.createSourceFile(
        validationsPath,
        '',
        scriptTarget,
        undefined,
        ts.ScriptKind.TS,
    );

    return ts.updateSourceFileNode(sourceFile, [
        ...generateSchemaBoilerplate(schemaDefinitions),
        ...generateIsTypeFn(),
        ...generateAssertIsTypeFn(),
        ...generateValidationError(),
    ]);
}

export function writeRuntimeValidatorToFile(
    program: ts.Program,
    schemaDefinitions: SchemaDefinitions,
) {
    const {
        outDir = '.',
        outFile,
        target = ts.ScriptTarget.ES3,
    } = program.getCompilerOptions();

    if (outFile) {
        throw new Error(
            `${pjson.name} does not work with outFile in tsconfig. Use a bundler with this transformer to bundle your output instead.`,
        );
    }

    let buildPath;

    if (path.isAbsolute(outDir)) {
        buildPath = outDir;
    } else {
        buildPath = path.join(program.getCurrentDirectory(), outDir);
    }

    const runtimeValidationsPath = path.join(
        buildPath,
        `${VALIDATIONS_GENERATED_FILENAME}.js`,
    );

    const sourceFile = generateSourceFileFromSchemaDefinitions(
        runtimeValidationsPath,
        target,
        schemaDefinitions,
    );

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const result = printer.printFile(sourceFile);

    ts.sys.writeFile(sourceFile.fileName, result);
}
