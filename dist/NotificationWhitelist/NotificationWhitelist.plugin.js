/**
 * @name NotificationWhitelist
 * @description Allows servers and channels to be added to a notification whitelist
 * @version 0.0.1
 * @author DeathByPrograms
 * @authorId 234086939102281728
 * @website https://github.com/deathbyprograms/BetterDiscordAddons/tree/main/dist/NotificationWhitelist
 * @source https://github.com/deathbyprograms/BetterDiscordAddons/blob/main/dist/NotificationWhitelist/NotificationWhitelist.plugin.js
 */
const config = {
    main: "index.js",
    id: "NotificationWhitelist",
    name: "NotificationWhitelist",
    author: "DeathByPrograms",
    authorId: "234086939102281728",
    authorLink: "",
    version: "0.0.1",
    description: "Allows servers and channels to be added to a notification whitelist",
    website: "https://github.com/deathbyprograms/BetterDiscordAddons/tree/main/dist/NotificationWhitelist",
    source: "https://github.com/deathbyprograms/BetterDiscordAddons/blob/main/dist/NotificationWhitelist/NotificationWhitelist.plugin.js",
    patreon: "",
    donate: "",
    invite: "",
    changelog: [],
    defaultConfig: []
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
     const plugin = (Plugin, Library) => {

    const {Logger, Settings} = Library;
    
    return class extends Plugin {

        constructor() {
            super();
            this.defaultSettings = {};
            this.defaultSettings.serverWhitelist = [];
            this.defaultSettings.channelWhitelist = [];
            this.defaultSettings.enableWhitelisting = true;
        }

        onStart() {
            Logger.info("Plugin enabled!");
            this.serverContextUnpatch = BdApi.ContextMenu.patch('guild-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.serverWhitelist.includes(props.guild.id), action: (_) => {
                    this.toggleServerWhitelisted(props.guild.id);
                }}));
            });
            this.channelContextUnpatch = BdApi.ContextMenu.patch('channel-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.channelWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleChannelWhitelisted(props.channel.id);
                }}));
            });
            this.userContextUnpatch = BdApi.ContextMenu.patch('user-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.channelWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleChannelWhitelisted(props.channel.id);
                }}));
            });
            var notifModule = BdApi.Webpack.getModule((m) => m.showNotification && m.requestPermission);
            BdApi.Patcher.instead("NotificationWhitelist", notifModule, "showNotification", (_, args, orig) => {
                if(!this.settings.enableWhitelisting)return orig(...args);
                if(!args[3])return orig(...args);
                if(this.settings.channelWhitelist.includes(args[3].channel_id))return orig(...args);
                if(args[3].guild_id && this.settings.serverWhitelist.includes(args[3].guild_id))return orig(...args);
                Logger.debug("Blocked notification: ", args[3]);
            });
        }

        onStop() {
            Logger.info("Plugin disabled!");
            BdApi.Patcher.unpatchAll("NotificationWhitelist");
            this.serverContextUnpatch();
            this.channelContextUnpatch();
            this.userContextUnpatch();
        }

        toggleServerWhitelisted(id){
            if(this.settings.serverWhitelist.includes(id))this.removeFromServerWhitelist(id);
            else this.addToServerWhitelist(id);
        }

        addToServerWhitelist(id){
            Logger.debug("Adding to server whitelist: ", id);
            if(!this.settings.serverWhitelist.includes(id)){
                this.settings.serverWhitelist.push(id);
                this.saveSettings();
            }
        }

        removeFromServerWhitelist(id){
            Logger.debug("Removing from server whitelist: ", id);
            if(this.settings.serverWhitelist.includes(id)){
                this.settings.serverWhitelist.splice(this.settings.serverWhitelist.indexOf(id), 1);
                this.saveSettings();
            }
        }

        toggleChannelWhitelisted(id){
            if(this.settings.channelWhitelist.includes(id))this.removeFromChannelWhitelist(id);
            else this.addToChannelWhitelist(id);
        }

        addToChannelWhitelist(id){
            Logger.debug("Adding to channel whitelist: ", id);
            if(!this.settings.channelWhitelist.includes(id)){
                this.settings.channelWhitelist.push(id);
                this.saveSettings();
            }
        }

        removeFromChannelWhitelist(id){
            Logger.debug("Removing from channel whitelist: ", id);
            if(this.settings.channelWhitelist.includes(id)){
                this.settings.channelWhitelist.splice(this.settings.channelWhitelist.indexOf(id), 1);
                this.saveSettings();
            }
        }
        
        clearWhitelist(){ 
            Logger.info("Clearing whitelist!");
            this.settings.serverWhitelist = [];
            this.settings.channelWhitelist = [];
            this.saveSettings();
        }

        getSettingsPanel() {
            var button = document.createElement("button");
            button.classList = "bd-button bd-settings-button bd-setting-item";
            button.onclick = this.clearWhitelist.bind(this);
            var text = document.createTextNode("Clear Whitelist");
            button.appendChild(text);

            return Settings.SettingPanel.build(this.saveSettings.bind(this),
                new Settings.Switch("Enable Whitelisting", "Enables notification whitelisting. Note: turning this on without any whitelisted channels/servers will disable all notifications.", 
                    this.settings.enableWhitelisting, (i) => {this.settings.enableWhitelisting = i;}),
                new Settings.SettingField("Clear Whitelist", "", () => {}, button)
            )
        }
    };

};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));