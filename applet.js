/*jshint esnext: true */
const
Clutter = imports.gi.Clutter;
const
Applet = imports.ui.applet;
const
PopupMenu = imports.ui.popupMenu;
const
Util = imports.misc.util;
const
St = imports.gi.St;
const
Gtk = imports.gi.Gtk;
const
Soup = imports.gi.Soup;
const
_httpSession = new Soup.SessionAsync();
const
Lang = imports.lang;
const
Mainloop = imports.mainloop;
const
Settings = imports.ui.settings;
const
Gio = imports.gi.Gio;

Soup.Session.prototype.add_feature.call(_httpSession,
		new Soup.ProxyResolverDefault());

var defaultTooltip = _("trying to fetch IP information");
var noConnectionIcon = "nm-no-connection";
var homeIcon = "gtk-home";

function IpIndicatorApplet(metadata, orientation, panel_height, instance_id) {
	this._init(metadata, orientation, panel_height, instance_id);
}

IpIndicatorApplet.prototype = {
	__proto__ : Applet.IconApplet.prototype,

	_init : function(metadata, orientation, panel_height, instance_id) {
		Applet.IconApplet.prototype._init.call(this, orientation, panel_height,
				instance_id);
		try {
			this.icon_theme = Gtk.IconTheme.get_default();
			this.icon_theme.append_search_path(metadata.path + "/flags");

			this.settings = new Settings.AppletSettings(this, metadata.uuid,
					instance_id);
			this._buildSettings();

			this.menuManager = new PopupMenu.PopupMenuManager(this);
			this._buildMenu(orientation);
			this._updateNoInfo();
			this._fetchInfo();
			this._fetchInfoPeriodic();

		} catch (e) {
			global.logError(e);
		}
	},

	_buildSettings : function() {
		this.settings.bindProperty(Settings.BindingDirection.IN, "home_isp",
				"homeIspName", this._updateSettings, null);
		this.settings
				.bindProperty(Settings.BindingDirection.IN,
						"home_isp_icon-name", "homeIspIcon",
						this._updateSettings, null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"home_isp_nickname", "homeIspNickname", this._updateSettings,
				null);

		this.settings.bindProperty(Settings.BindingDirection.IN, "other1_isp",
				"other1IspName", this._updateSettings, null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other1_isp_icon-name", "other1IspIcon", this._updateSettings,
				null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other1_isp_nickname", "other1IspNickname",
				this._updateSettings, null);

		this.settings.bindProperty(Settings.BindingDirection.IN, "other2_isp",
				"other2IspName", this._updateSettings, null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other2_isp_icon-name", "other2IspIcon", this._updateSettings,
				null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other2_isp_nickname", "other2IspNickname",
				this._updateSettings, null);

		this.settings.bindProperty(Settings.BindingDirection.IN, "other3_isp",
				"other3IspName", this._updateSettings, null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other3_isp_icon-name", "other3IspIcon", this._updateSettings,
				null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other3_isp_nickname", "other3IspNickname",
				this._updateSettings, null);

		this.settings.bindProperty(Settings.BindingDirection.IN, "other4_isp",
				"other4IspName", this._updateSettings, null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other4_isp_icon-name", "other4IspIcon", this._updateSettings,
				null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other4_isp_nickname", "other4IspNickname",
				this._updateSettings, null);

		this.settings.bindProperty(Settings.BindingDirection.IN, "other5_isp",
				"other5IspName", this._updateSettings, null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other5_isp_icon-name", "other5IspIcon", this._updateSettings,
				null);
		this.settings.bindProperty(Settings.BindingDirection.IN,
				"other5_isp_nickname", "other5IspNickname",
				this._updateSettings, null);

		this.settings.bindProperty(Settings.BindingDirection.IN,
				"update_interval", "updateInterval", this._restartTimer, null);
		this._prepareIspsSettings();
	},

	_updateSettings : function() {
		this._prepareIspsSettings();
		this._fetchInfo();
	},

	_buildMenu : function(orientation) {
		this.menu = new Applet.AppletPopupMenu(this, orientation);
		this.menuManager.addMenu(this.menu);

		this._infoBox = new St.BoxLayout();
		this._infoBox.set_vertical(true);
		this._infoBox.set_margin_left(22);
		this._infoBox.set_margin_right(22);

		this._ip = new St.Label();
		this._infoBox.add(this._ip);

		this._isp = new St.Label();
		this._infoBox.add(this._isp);

		this._country = new St.Label();
		this._infoBox.add(this._country);

		this.menu.addActor(this._infoBox);

		// this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		// this.menu.addAction(_("Refresh"), (function() {
		// this._fetchInfo();
		// }).bind(this));

	},

	_prepareIspsSettings : function() {
		this.homeIsp = {
			name : this.homeIspName,
			icon : this.homeIspIcon,
			nickname : this.homeIspNickname
		};
		this.other1_isp = {
			name : this.other1IspName,
			icon : this.other1IspIcon,
			nickname : this.other1IspNickname
		};
		this.other2_isp = {
			name : this.other2IspName,
			icon : this.other2IspIcon,
			nickname : this.other2IspNickname
		};
		this.other3_isp = {
			name : this.other3IspName,
			icon : this.other3IspIcon,
			nickname : this.other3IspNickname
		};
		this.other4_isp = {
			name : this.other4IspName,
			icon : this.other4IspIcon,
			nickname : this.other4IspNickname
		};
		this.other5_isp = {
			name : this.other5IspName,
			icon : this.other5IspIcon,
			nickname : this.other5IspNickname
		};
		this.ispsSettings = [ this.homeIsp, this.other1_isp, this.other2_isp,
				this.other3_isp, this.other4_isp, this.other5_isp ];
	},

	_fetchInfo : function() {
		var self = this;
		var request = new Soup.Message({
			method : 'GET',
			uri : new Soup.URI('http://www.telize.com/geoip')
		});
		_httpSession.queue_message(request, function(_httpSession, message) {
			if (message.status_code !== 200) {
				self._updateNoInfo();
				return;
			}
			var ipInfoJSON = request.response_body.data;
			var ipInfo = JSON.parse(ipInfoJSON);
			self._updateInfo(ipInfo.ip, ipInfo.isp, ipInfo.country,
					ipInfo.country_code.toLowerCase());
		});

	},

	_updateNoInfo : function() {
		this._infoBox.hide();
		this.set_applet_tooltip(defaultTooltip);
		this.set_applet_icon_symbolic_name(noConnectionIcon);
		this.set_applet_icon_name(noConnectionIcon);
	},

	_updateInfo : function(ip, isp, country, countryCode) {
		this._infoBox.show();
		this._ip.set_text(ip);
		this._country.set_text(country);

		var tooltip = ip;
		var ispName = isp;
		var iconName;
		var isIspSettingFound = false;

		for (var i = 0; i < this.ispsSettings.length; i++) {
			var ispSetting = this.ispsSettings[i];
			if (isp == ispSetting.name) {
				if (ispSetting.icon) {
					iconName = ispSetting.icon;
				} else {
					iconName = countryCode;
				}
				if (ispSetting.nickname) {
					tooltip = ispSetting.nickname;
					ispName = ispSetting.nickname;
				}
				isIspSettingFound = true;
				break;
			}
		}

		if (!isIspSettingFound) {
			iconName = countryCode;
		}

		var icon_file = Gio.File.new_for_path(iconName);
		if (icon_file.query_exists(null)) {
			this.set_applet_icon_path(iconName);
		} else {
			this.set_applet_icon_symbolic_name(iconName);
			this.set_applet_icon_name(iconName);
		}

		this.set_applet_tooltip(tooltip);
		this._isp.set_text(ispName);
	},

	_fetchInfoPeriodic : function() {
		this._fetchInfo();
		this._periodicTimeoutId = Mainloop.timeout_add_seconds(
				this.updateInterval, Lang.bind(this, this._fetchInfoPeriodic));
	},

	_restartTimer : function() {
		if (this._periodicTimeoutId) {
			Mainloop.source_remove(this._periodicTimeoutId);
		}
		this._fetchInfoPeriodic();
	},

	on_applet_removed_from_panel : function() {
		if (this._periodicTimeoutId) {
			Mainloop.source_remove(this._periodicTimeoutId);
		}
		this.settings.finalize();
	},

	on_applet_clicked : function() {
		this.menu.toggle();
	}
};

function main(metadata, orientation, panel_height, instance_id) {
	return new IpIndicatorApplet(metadata, orientation, panel_height,
			instance_id);
}
