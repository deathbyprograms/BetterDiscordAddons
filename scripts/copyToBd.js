const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

if (process.argv.length < 3) {
  console.error("Expected at least one plugin argument!");
  process.exit(1);
}

const plugins = process.argv.slice(2);

for (let plugin of plugins) {
  const srcPath = path.resolve("dist", plugin, `${plugin}.plugin.js`);
  let betterDiscordLoc;
  switch (os.type()) {
    case "Linux":
      betterDiscordLoc = path.resolve(os.homedir(), ".config");
      break;
    case "Darwin":
      betterDiscordLoc = path.resolve(os.homedir(), "Library", "Application Support");
      break;
    case "Windows_NT":
      betterDiscordLoc = path.resolve(process.env.APPDATA);
      break;
  }
  const destPath = path.resolve(betterDiscordLoc, "BetterDiscord", "plugins", `${plugin}.plugin.js`)
  fs.copyFileSync(srcPath, destPath);
}
