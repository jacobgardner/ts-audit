/*
We have to use a custom test harness because I don't know of any test framework
that will do what I want this to do.
*/
import * as fs from 'fs';
import * as path from 'path';
// import * as ts from 'ttypescript';
import { spawnSync } from 'child_process';

// const output = ts.readConfigFile('./tsconfig.json', path => {
//     return fs.readFileSync(path).toString();
// });

// const { compilerOptions } = output.config;

function compileFile(path: string, suppressError: boolean): boolean {
    const result = spawnSync('ttsc', [path]);

    if (!suppressError && result.status) {
        console.log(result.output.toString());
    }

    return !result.status;
}

const validFiles = fs.readdirSync('./valid');
const invalidFiles = fs.readdirSync('./invalid');

let allPassed = true;

for (const file of validFiles) {
    const fullPath = path.join('./valid', file);
    console.log('--------------------------------------------');
    console.log(`Testing ${fullPath}:`);
    console.log('--------------------------------------------');
    console.log(`* compiles?`);

    if (!compileFile(fullPath, false)) {
        allPassed = false;
        console.error('   - failed to compile');
        continue;
    }
    console.log(`   - passed.`);
    console.log(`* runs?`);

    const response = spawnSync('node', [
        `./build/valid/${file.slice(0, -3)}.js`,
    ]);

    if (response.status !== 0) {
        allPassed = false;
        console.error('   - runtime process threw exception ');
    } else {
        console.log('   - passed.');
    }
}

for (const file of invalidFiles) {
    const fullPath = path.join('./invalid', file);
    console.log('--------------------------------------------');
    console.log(`Testing ${fullPath}:`);
    console.log('--------------------------------------------');
    console.log(`* errors during compile?`);
    if (compileFile(fullPath, true)) {
        allPassed = false;
        console.error(`   - Expected to fail compilation...`);
    } else {
        console.log(`   - passed.`);
    }
}

if (allPassed) {
    process.exit(0);
} else {
    process.exit(1);
}
