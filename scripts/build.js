const fs = require('fs');
const path = require("path");
const childProcess = require("child_process");

const projectRoot = path.dirname(process.env.npm_package_json);

const args = process.argv.slice(2);
if (args.length != 1) {
    console.error(`Only one argument expected for build, got ${args.length}`);
    process.exit(1);
}

const pluginName = args[0];

console.log(`Building ${pluginName}`);

// Check if plugin source exists
if(!fs.existsSync(path.join(projectRoot, "src/plugins/", pluginName))){
    console.error(`Plugin ${pluginName} was not found!`);
    process.exit(1);
}

console.log("\n\nBuilding plugin with zpl\n\n");
childProcess.execSync(`npm run zplBuild ${pluginName}`, {stdio: "inherit"});

console.log("\n\nPackaging plugin for distribution\n\n");
childProcess.execSync(`npm run package ${pluginName}`, {stdio: "inherit"});