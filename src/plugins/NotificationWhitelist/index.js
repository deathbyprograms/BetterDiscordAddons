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
            this.defaultSettings.channelWhitelist = [];
            this.defaultSettings.enableWhitelisting = true;
        }

        onStart() {
            Logger.info("Plugin enabled!");
            this.contextPatchRemovers = [];
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('guild-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.serverWhitelist.includes(props.guild.id), action: (_) => {
                    this.toggleServerWhitelisted(props.guild.id);
                }}));
            }));
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('channel-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.channelWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleChannelWhitelisted(props.channel.id);
                }}));
            }));
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('user-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.channelWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleChannelWhitelisted(props.channel.id);
                }}));
            }));
            this.contextPatchRemovers.push(BdApi.ContextMenu.patch('gdm-context', (res, props) => {
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "separator"}));
                res.props.children.push(BdApi.ContextMenu.buildItem({type: "toggle", label: "Notifications Whitelisted", 
                checked: this.settings.serverWhitelist.includes(props.channel.id), action: (_) => {
                    this.toggleServerWhitelisted(props.channel.id);
                }}));
            }));
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
            for(var patchRemover of this.contextPatchRemovers)patchRemover();
            this.contextPatchRemovers = [];
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