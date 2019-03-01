import * as fs from "fs";
import * as path from "path";

function findPackage(root: string = __dirname): string {
    const packagePath = path.join(root, "package.json");
    if (fs.existsSync(packagePath)) {
        return packagePath;
    }

    return findPackage(path.join(root, ".."));
}

const pkg = JSON.parse(
    fs.readFileSync(findPackage()).toString()
);

export const MODULE_NAME = pkg.name;
