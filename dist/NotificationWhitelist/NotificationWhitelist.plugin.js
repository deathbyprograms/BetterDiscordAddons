/**
 * @name NotificationWhitelist
 * @author DeathByPrograms
 * @description Allows servers and channels to be added to a notification whitelist
 * @version 1.1.0
 * @authorId 234086939102281728
 * @website https//github.com/deathbyprograms/BetterDiscordAddons/tree/main/dist/NotificationWhitelist
 * @source https//github.com/deathbyprograms/BetterDiscordAddons/blob/main/dist/NotificationWhitelist/NotificationWhitelist.plugin.js
 */
module.exports = class {
  constructor() {
    // Initialize the settings for the plugin
    this.settings = {};
    this.settings.serverWhitelist = [];
    this.settings.folderWhitelist = [];
    this.settings.channelWhitelist = [];
    this.settings.enableWhitelisting = true;
    this.settings.allowNonMessageNotifications = false;

    this.modules = {};
  }

  start() {
    BdApi.Logger.info("NotificationWhitelist", "Plugin enabled!");
    this.loadSettings();

    // Get webpack modules
    this.modules.folderModule = BdApi.Webpack.getByKeys("getGuildFolderById");
    this.modules.notifModule = BdApi.Webpack.getByKeys(
      "showNotification",
      "requestPermission"
    );

    this.contextPatchRemovers = [];

    // Add the whitelist option to the server and folder context menu.
    this.contextPatchRemovers.push(
      BdApi.ContextMenu.patch("guild-context", (res, props) => {
        res.props.children.push(
          BdApi.ContextMenu.buildItem({ type: "separator" })
        );

        if (props.guild) {
          // Check if the context menu is for a server.
          res.props.children.push(
            BdApi.ContextMenu.buildItem({
              type: "toggle",
              label: "Notifications Whitelisted",
              checked: this.settings.serverWhitelist.includes(props.guild.id),
              action: (_) => {
                this.toggleWhitelisted(
                  props.guild.id,
                  this.settings.serverWhitelist
                );
              },
            })
          );
        } else if (props.folderId) {
          // Check if the context menu is for a folder.
          res.props.children.push(
            BdApi.ContextMenu.buildItem({
              type: "toggle",
              label: "Notifications Whitelisted",
              checked: this.settings.folderWhitelist.includes(props.folderId),
              action: (_) => {
                this.toggleWhitelisted(
                  props.folderId,
                  this.settings.folderWhitelist
                );
              },
            })
          );
        }
      })
    );

    // Add the whitelist option to the channel context menu.
    this.contextPatchRemovers.push(
      BdApi.ContextMenu.patch("channel-context", (res, props) => {
        res.props.children.push(
          BdApi.ContextMenu.buildItem({ type: "separator" })
        );
        res.props.children.push(
          BdApi.ContextMenu.buildItem({
            type: "toggle",
            label: "Notifications Whitelisted",
            checked: this.settings.channelWhitelist.includes(props.channel.id),
            action: (_) => {
              this.toggleWhitelisted(
                props.channel.id,
                this.settings.channelWhitelist
              );
            },
          })
        );
      })
    );

    // Add the whitelist option to the DM context menu for single users.
    this.contextPatchRemovers.push(
      BdApi.ContextMenu.patch("user-context", (res, props) => {
        res.props.children.push(
          BdApi.ContextMenu.buildItem({ type: "separator" })
        );
        res.props.children.push(
          BdApi.ContextMenu.buildItem({
            type: "toggle",
            label: "Notifications Whitelisted",
            checked: this.settings.channelWhitelist.includes(props.channel.id),
            action: (_) => {
              this.toggleWhitelisted(
                props.channel.id,
                this.settings.channelWhitelist
              );
            },
          })
        );
      })
    );

    // Add the whitelist option to the group DM context menu.
    this.contextPatchRemovers.push(
      BdApi.ContextMenu.patch("gdm-context", (res, props) => {
        res.props.children.push(
          BdApi.ContextMenu.buildItem({ type: "separator" })
        );
        res.props.children.push(
          BdApi.ContextMenu.buildItem({
            type: "toggle",
            label: "Notifications Whitelisted",
            checked: this.settings.channelWhitelist.includes(props.channel.id),
            action: (_) => {
              this.toggleWhitelisted(
                props.channel.id,
                this.settings.channelWhitelist
              );
            },
          })
        );
      })
    );

    // Patch the showNotification function to intercept notifications if they are not whitelisted while whitelisting is enabled.
    BdApi.Patcher.instead(
      "NotificationWhitelist",
      this.modules.notifModule,
      "showNotification",
      (_, args, orig) => {
        if (!this.settings.enableWhitelisting) return orig(...args); // If whitelisting is disabled, allow the notification.
        if (!args[3]) return orig(...args); // If the showNotification function is somehow called without the proper information, allow the notification.
        if (
          this.settings.allowNonMessageNotifications &&
          !args[3].channel_id &&
          !args[3].guild_id
        )
          return orig(...args); // If the notification is not for a channel or server (e.g. friend requests) and such notifications are allowed, allow the notification.
        if (this.settings.channelWhitelist.includes(args[3].channel_id))
          return orig(...args); // If the channel is whitelisted, allow the notification.
        if (
          args[3].guild_id &&
          this.settings.serverWhitelist.includes(args[3].guild_id)
        )
          return orig(...args); // If the notification is from a whitelisted server, allow the notificaiton.
        if (
          args[3].guild_id &&
          this.checkIfGuildInFolderWhitelist(args[3].guild_id)
        )
          return orig(...args); // If the notification is from a whitelisted folder, allow the notification.
        BdApi.Logger.debug(
          "NotificationWhitelist",
          "Blocked notification: ",
          args[3]
        );
      }
    );
  }

  stop() {
    BdApi.Logger.info("NotificationWhitelist", "Plugin disabled!");

    // Unpatch all the patches we made.
    BdApi.Patcher.unpatchAll("NotificationWhitelist");
    for (var patchRemover of this.contextPatchRemovers) patchRemover();
    this.contextPatchRemovers = [];
  }

  /**
   * Load settings from config file
   */
  loadSettings() {
    BdApi.Logger.debug("NotificationWhitelist", "Loading settings");
    this.settings = BdApi.Data.load("NotificationWhitelist", "settings");
  }

  /**
   * Save settings to config file
   */
  saveSettings() {
    BdApi.Logger.debug("NotificationWhitelist", "Saving settings");
    BdApi.Data.save("NotificationWhitelist", "settings", this.settings);
  }

  /**
   * Toggles the whitelisted status of the given id
   *
   * @param {string} id - The id of the channel/server/folder to toggle
   * @param {Array<string>} arr - The whitelist array to toggle the id in
   */
  toggleWhitelisted(id, arr) {
    if (arr.includes(id)) this.removeFromWhitelist(id, arr);
    else this.addToWhitelist(id, arr);
  }

  /**
   * Whitelists the given id
   *
   * @param {string} id - The id of the channel/server/folder to whitelist
   * @param {Array<string>} arr - The whitelist array to add the id to
   */
  addToWhitelist(id, arr) {
    BdApi.Logger.debug("NotificationWhitelist", "Adding to whitelist: ", id);
    if (!arr.includes(id)) {
      arr.push(id);
      this.saveSettings();
    }
  }

  /**
   * Removes the given id from the whitelist
   *
   * @param {string} id - The id of the channel/server/folder to remove from the whitelist
   * @param {Array<string>} arr - The whitelist array to remove the id from
   */
  removeFromWhitelist(id, arr) {
    BdApi.Logger.debug(
      "NotificationWhitelist",
      "Removing from whitelist: ",
      id
    );
    if (arr.includes(id)) {
      arr.splice(arr.indexOf(id), 1);
      this.saveSettings();
    }
  }

  /**
   * Clears all whitelists
   */
  clearWhitelist() {
    BdApi.Logger.info("NotificationWhitelist", "Clearing whitelist!");
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

    return BdApi.UI.buildSettingsPanel({
      settings: [
        {
          type: "switch",
          id: "enableWhitelisting",
          name: "Enable whitelisting",
          note: "Enables notification whitelisting. Note: turning this on without any whitelisted channels/servers will disable all notifications.",
          value: this.settings.enableWhitelisting,
          onChange: ((value) => {
            this.settings.enableWhitelisting = value;
          }).bind(this),
        },
        {
          type: "switch",
          id: "allowNonMessageNotifications",
          name: "Allow non-message notifications",
          note: "Allows notifications that are not for messages to be shown (e.g. friend requests).",
          value: this.settings.allowNonMessageNotifications,
          onChange: ((value) => {
            this.settings.allowNonMessageNotifications = value;
          }).bind(this),
        },
        {
          type: "custom",
          id: "clearWhitelist",
          name: "Clear whitelist",
          note: "",
          children: BdApi.React.createElement(
            BdApi.Components.Button,
            {
              onClick: () =>
                BdApi.UI.showConfirmationModal(
                  "Really Clear Whitelists?",
                  "Are you sure you want to clear your notification whitelists? This is irreversible",
                  {
                    danger: true,
                    confirmText: "Clear",
                    onConfirm: this.clearWhitelist.bind(this),
                  }
                ),
              color: BdApi.Components.Button.Colors.RED,
              size: BdApi.Components.Button.Sizes.SMALL,
            },
            "Clear"
          ),
        },
      ],
      onChange: this.saveSettings.bind(this),
    });
  }

  /**
   * Checks whether the given guild is in a whitelisted folder
   *
   * @param {string} guildId - The guild id to check
   * @returns {boolean} - Whether the guild is in a whitelisted folder
   */
  checkIfGuildInFolderWhitelist(guildId) {
    return this.settings.folderWhitelist.some((folderId) =>
      this.modules.folderModule
        .getGuildFolderById(folderId)
        .guildIds.includes(guildId)
    );
  }
};
