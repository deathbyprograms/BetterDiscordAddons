/**
 * 
 * @param {import("zerespluginlibrary").Plugin} Plugin 
 * @param {import("zerespluginlibrary").BoundAPI} Library 
 * @returns 
 */
module.exports = (Plugin, Library) => {

    const {Logger, Settings} = Library;
    
    return class extends Plugin {

        constructor() {
            super();
            this.defaultSettings = {};
            this.defaultSettings.serverWhitelist = [];
            this.defaultSettings.folderWhitelist = [];
            this.defaultSettings.channelWhitelist = [];
            this.defaultSettings.enableWhitelisting = true;
        }

        onStart() {
            Logger.info("Plugin enabled!");
            this.contextPatchRemovers = [];
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('guild-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                if(props.guild) {
                    res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                    checked: this.settings.serverWhitelist.includes(props.guild.id), action: (_) => {
                        this.toggleWhitelisted(props.guild.id, this.settings.serverWhitelist);
                    }}));
                } else if(props.folderId){
                    res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                    checked: this.settings.folderWhitelist.includes(props.folderId), action: (_) => {
                        this.toggleWhitelisted(props.folderId, this.settings.folderWhitelist);
                    }}));
                }
            }));
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('channel-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.channelWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleWhitelisted(props.channel.id, this.settings.channelWhitelist);
                }}));
            }));
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('user-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.channelWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleWhitelisted(props.channel.id, this.settings.channelWhitelist);
                }}));
            }));
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('gdm-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.channelWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleWhitelisted(props.channel.id, this.settings.channelWhitelist);
                }}));
            }));
            var notifModule = BdApi.Webpack.getModule((m) => m.showNotification && m.requestPermission);
            BdApi.Patcher.instead("NotificationWhitelist", notifModule, "showNotification", (_, args, orig) => {
                if(!this.settings.enableWhitelisting)return orig(...args);
                if(!args[3])return orig(...args);
                if(this.settings.channelWhitelist.includes(args[3].channel_id))return orig(...args);
                if(args[3].guild_id && this.settings.serverWhitelist.includes(args[3].guild_id))return orig(...args);
                if(args[3].guild_id && this.checkIfGuildInFolderWhitelist(args[3].guild_id))return orig(...args);
                Logger.debug("Blocked notification: ", args[3]);
            });
        }

        onStop() {
            Logger.info("Plugin disabled!");
            BdApi.Patcher.unpatchAll("NotificationWhitelist");
            for(var patchRemover of this.contextPatchRemovers)patchRemover();
            this.contextPatchRemovers = [];
        }

        toggleWhitelisted(id, arr){
            if(arr.includes(id))this.removeFromWhitelist(id, arr);
            else this.addToWhitelist(id, arr);
        }

        addToWhitelist(id, arr){
            Logger.debug("Adding to whitelist: ", id);
            if(!arr.includes(id)){
                arr.push(id);
                this.saveSettings();
            }
        }

        removeFromWhitelist(id, arr){
            Logger.debug("Removing from whitelist: ", id);
            if(arr.includes(id)){
                arr.splice(arr.indexOf(id), 1);
                this.saveSettings();
            }
        }
        
        clearWhitelist(){ 
            Logger.info("Clearing whitelist!");
            this.settings.serverWhitelist = [];
            this.settings.folderWhitelist = [];
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

        checkIfGuildInFolderWhitelist(guildId){
            var folderModule = BdApi.Webpack.getModule((m) => m.getGuildFolderById);
            for(var folderId of this.settings.folderWhitelist){
                if(folderModule.getGuildFolderById(folderId).guildIds.includes(guildId))return true;
            }
            return false;
        }
    };

};