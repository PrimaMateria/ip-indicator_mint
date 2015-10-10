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

			l
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
				"homeIsp", this._fetchInfo, null);

		this.settings.bindProperty(Settings.BindingDirection.IN,
				"update_interval", "updateInterval", this._restartTimer, null);
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
		this._isp.set_text(isp);
		this.set_applet_tooltip(ip);
		this._country.set_text(country);
		if (isp == this.homeIsp) {
			this.set_applet_icon_symbolic_name(homeIcon);
			this.set_applet_icon_name(homeIcon);
		} else {
			this.set_applet_icon_symbolic_name(countryCode);
			this.set_applet_icon_name(countryCode);
		}
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
