const fs = require('fs');
const path = require("path");

const projectRoot = path.dirname(process.env.npm_package_json);

const args = process.argv.slice(2);
if (args.length != 1) {
    console.error(`Only one argument expected for packageForDist.js, got ${args.length}`);
    process.exit(1);
}

const pluginName = args[0];

// Check if plugin source exists
if(!fs.existsSync(path.join(projectRoot, "src/plugins/", pluginName))){
    console.error(`Plugin ${pluginName} was not found!`);
    process.exit(1);
}

// Check if plugin was successfully built by zpl
if(!fs.existsSync(path.join(projectRoot, "build", `${pluginName}.plugin.js`))){
    console.error(`Plugin ${pluginName} was not built!`);
    process.exit(1);
}

// Creates dist folder if it doesn't exist
if(!fs.existsSync(path.join(projectRoot, "dist"))){
    fs.mkdirSync(path.join(projectRoot, "dist"));
}

// Removes old build if it exists
if(fs.existsSync(path.join(projectRoot, "dist", pluginName))){
    fs.rmSync(path.join(projectRoot, "dist", pluginName), {recursive: true});
}

// Creates new build folder
fs.mkdirSync(path.join(projectRoot, "dist", pluginName));
fs.copyFileSync(path.join(projectRoot, "build", `${pluginName}.plugin.js`), path.join(projectRoot, "dist", pluginName, `${pluginName}.plugin.js`));
if(fs.existsSync(path.join(projectRoot, "src/plugins", pluginName, "README.md"))){
    fs.copyFileSync(path.join(projectRoot, "src/plugins", pluginName, "README.md"), path.join(projectRoot, "dist", pluginName, "README.md"));
}