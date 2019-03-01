#!/usr/bin/env node

import commander from 'commander';
// TODO: Fix circular dependency
import { processProject } from './process';

export interface Options {
    typeDefinitionsPath: string;
    schemaPath: string;
    projectPath?: string;
}

const options: Partial<Options> = {};

commander
    .version('0.1.0')
    .arguments('<type-definitions-path.d.ts> <schema-path.json>')
    .action((typeDefnPath: string, schemaPath: string) => {
        options.typeDefinitionsPath = typeDefnPath;
        options.schemaPath = schemaPath;
    })
    .option('-p, --project <project>', 'tsconfig.json project (defaults to ./tsconfig.json)');

commander.parse(process.argv);

options.projectPath = commander.project || './tsconfig.json';

// TODO: Actually verify before using
processProject(options as Options);
