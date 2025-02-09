/**
 * @name NotificationWhitelist
 * @author DeathByPrograms
 * @description Allows servers and channels to be added to a notification whitelist
 * @version 1.1.0
 * @authorId 234086939102281728
 * @website https//github.com/deathbyprograms/BetterDiscordAddons/tree/main/dist/NotificationWhitelist
 * @source https//github.com/deathbyprograms/BetterDiscordAddons/blob/main/dist/NotificationWhitelist/NotificationWhitelist.plugin.js
 */
const DEFAULT_SETTINGS = {
  folderWhitelist: [],
  serverWhitelist: [],
  serverBlacklist: [],
  channelWhitelist: [],
  channelBlacklist: [],
  enableWhitelisting: true,
  allowNonMessageNotifications: false,
};

module.exports = class {
  constructor() {
    // Initialize the settings for the plugin
    this.settings = structuredClone(DEFAULT_SETTINGS);

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

        // Check if the context menu is for a server.
        if (props.guild) {
          // Add server whitelist toggle
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
          // Add server blacklist toggle
          res.props.children.push(
            BdApi.ContextMenu.buildItem({
              type: "toggle",
              label: "Notifications Blacklisted",
              checked: this.settings.serverBlacklist.includes(props.guild.id),
              action: (_) => {
                this.toggleBlacklisted(
                  props.guild.id,
                  this.settings.serverBlacklist
                );
              },
            })
          );
          // Check if the context menu is for a folder.
        } else if (props.folderId) {
          // Add folder whitelist toggle
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
        // Add channel whitelist toggle
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
        // Add channel blacklist toggle
        res.props.children.push(
          BdApi.ContextMenu.buildItem({
            type: "toggle",
            label: "Notifications Blacklisted",
            checked: this.settings.channelBlacklist.includes(props.channel.id),
            action: (_) => {
              this.toggleBlacklisted(
                props.channel.id,
                this.settings.channelBlacklist
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

        const notif = args[3];

        if (
          this.settings.allowNonMessageNotifications &&
          !notif.channel_id &&
          !notif.guild_id
        )
          return orig(...args); // If the notification is not for a channel or server (e.g. friend requests) and such notifications are allowed, allow the notification.

        // If channel is blacklisted, skip all whitelist checks
        if (!this.isBlacklisted(notif.channel_id, notif.guild_id)) {
          if (this.settings.channelWhitelist.includes(notif.channel_id))
            return orig(...args); // If the channel is whitelisted, allow the notification.
          if (
            notif.guild_id &&
            this.settings.serverWhitelist.includes(notif.guild_id)
          )
            return orig(...args); // If the server is whitelisted, allow the notification.
          if (notif.guild_id && this.guildInFolderWhitelist(notif.guild_id))
            return orig(...args); // If the folder is whitelisted, allow the notification.
        }
        BdApi.Logger.debug(
          "NotificationWhitelist",
          "Blocked notification: ",
          notif
        );
        return new Promise((resolve) => {
          resolve();
        });
      }
    );
  }

  stop() {
    BdApi.Logger.info("NotificationWhitelist", "Plugin disabled!");

    // Unpatch all the patches we made.
    BdApi.Patcher.unpatchAll("NotificationWhitelist");
    for (var patchRemover of this.contextPatchRemovers) patchRemover();
  }

  /**
   * Load settings from config file
   */
  loadSettings() {
    BdApi.Logger.debug("NotificationWhitelist", "Loading settings");
    if (!BdApi.Data.load("NotificationWhitelist", "settings"))
      BdApi.Data.save("NotificationWhitelist", "settings", DEFAULT_SETTINGS);
    this.settings = {
      ...structuredClone(DEFAULT_SETTINGS),
      ...BdApi.Data.load("NotificationWhitelist", "settings"),
    };
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
   * @param {string} id The id of the channel/server/folder to toggle
   * @param {Array<string>} arr The whitelist array to toggle the id in
   */
  toggleWhitelisted(id, arr) {
    if (arr.includes(id)) this.removeFromWhitelist(id, arr);
    else this.addToWhitelist(id, arr);
  }

  /**
   * Toggles the blacklisted status of the given id
   *
   * @param {string} id The id of the channel/server/folder to toggle
   * @param {Array<string>} arr The blacklist array to toggle the id in
   */
  toggleBlacklisted(id, arr) {
    if (arr.includes(id)) this.removeFromBlacklist(id, arr);
    else this.addToBlacklist(id, arr);
  }

  /**
   * Whitelists the given id
   *
   * @param {string} id The id of the channel/server/folder to whitelist
   * @param {Array<string>} arr The whitelist array to add the id to
   */
  addToWhitelist(id, arr) {
    BdApi.Logger.debug("NotificationWhitelist", "Adding to whitelist: ", id);
    if (!arr.includes(id)) {
      arr.push(id);
      this.saveSettings();
    }
  }

  /**
   * Blacklists the given id
   *
   * @param {string} id The id of the channel/server/folder to blacklist
   * @param {Array<string>} arr The blacklist array to add the id to
   */
  addToBlacklist(id, arr) {
    BdApi.Logger.debug("NotificationWhitelist", "Adding to blacklist: ", id);
    if (!arr.includes(id)) {
      arr.push(id);
      this.saveSettings();
    }
  }

  /**
   * Removes the given id from the whitelist
   *
   * @param {string} id The id of the channel/server/folder to remove from the whitelist
   * @param {Array<string>} arr The whitelist array to remove the id from
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
   * Removes the given id from the blacklist
   *
   * @param {string} id The id of the channel/server/folder to remove from the blacklist
   * @param {Array<string>} arr The blacklist array to remove the id from
   */
  removeFromBlacklist(id, arr) {
    BdApi.Logger.debug(
      "NotificationWhitelist",
      "Removing from blacklist: ",
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
  clearWhitelists() {
    BdApi.Logger.info("NotificationWhitelist", "Clearing whitelist!");
    this.settings.serverWhitelist = [];
    this.settings.folderWhitelist = [];
    this.settings.channelWhitelist = [];
    this.saveSettings();
  }

  /**
   * Clears all blacklists
   */
  clearBlacklists() {
    BdApi.Logger.info("NotificationWhitelist", "Clearing blacklist!");
    this.settings.serverBlacklist = [];
    this.settings.channelBlacklist = [];
    this.saveSettings();
  }

  getSettingsPanel() {
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
          type: "button",
          id: "clearWhitelist",
          name: "Clear whitelist",
          note: "",
          children: "Clear",
          color: BdApi.Components.Button.Colors.RED,
          size: BdApi.Components.Button.Sizes.SMALL,
          onClick: () => {
            BdApi.UI.showConfirmationModal(
              "Really Clear Whitelists?",
              "Are you sure you want to clear your notification whitelists? This is irreversible",
              {
                danger: true,
                confirmText: "Clear",
                onConfirm: this.clearWhitelists.bind(this),
              }
            );
          },
        },
        {
          type: "button",
          id: "clearBlacklist",
          name: "Clear blacklist",
          note: "",
          children: "Clear",
          color: BdApi.Components.Button.Colors.RED,
          size: BdApi.Components.Button.Sizes.SMALL,
          onClick: () => {
            BdApi.UI.showConfirmationModal(
              "Really Clear Blacklists?",
              "Are you sure you want to clear your notification blacklists? This is irreversible",
              {
                danger: true,
                confirmText: "Clear",
                onConfirm: this.clearBlacklists.bind(this),
              }
            );
          },
        },
      ],
      onChange: this.saveSettings.bind(this),
    });
  }

  /**
   * Checks whether the given guild is in a whitelisted folder
   *
   * @param {string} guildId The guild id to check
   * @returns {boolean} Whether the guild is in a whitelisted folder
   */
  guildInFolderWhitelist(guildId) {
    return this.settings.folderWhitelist.some((folderId) =>
      this.modules.folderModule
        .getGuildFolderById(folderId)
        .guildIds.includes(guildId)
    );
  }

  /**
   * Checks whether the given channel is blacklisted
   *
   * @param {string} channelId The channel id to check
   * @param {string|undefined} guildId The guild id to check
   * @returns {boolean} Whether the channel is blacklisted or not
   */
  isBlacklisted(channelId, guildId) {
    return (
      this.settings.channelBlacklist.includes(channelId) ||
      (guildId && this.settings.serverBlacklist.includes(guildId))
    );
  }
};
