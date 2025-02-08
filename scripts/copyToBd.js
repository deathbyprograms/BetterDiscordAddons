const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const plugins = fs.readdirSync("dist");

for (let plugin of plugins) {
  const srcPath = path.resolve("dist", plugin, `${plugin}.plugin.js`);
  let betterDiscordLoc;
  switch (os.type()) {
    case "Linux":
      betterDiscordLoc = path.resolve(os.homedir(), ".config");
      break;
    case "Darwin":
      betterDiscordLoc = path.resolve(
        os.homedir(),
        "Library",
        "Application Support"
      );
      break;
    case "Windows_NT":
      betterDiscordLoc = path.resolve(process.env.APPDATA);
      break;
  }
  const destPath = path.resolve(
    betterDiscordLoc,
    "BetterDiscord",
    "plugins",
    `${plugin}.plugin.js`
  );
  fs.copyFileSync(srcPath, destPath);
}
