var keystone = require('keystone');
var _ = require('lodash');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var add_item = '<a class="btn btn-create" href="javascript:;" onclick="window.open(\'/keystone/menu-items\');">Create a Menu item</a>';
var add_subitem = '<a class="btn btn-create" href="javascript:;" onclick="window.open(\'/keystone/submenu-items\');">Create a Sub-menu item</a>';


var Menu = new keystone.List('Menu', {
	map: { name: 'name' },
	autokey: { from: 'name', path: 'key', unique: true },
	path: 'navigation',
	label: 'Menu',
	singular: 'Menu',
	plural: 'Menu'
});

Menu.add({
	name: {
		type: Types.Text,
		label: 'Name',
		required: true
	},
	key: {
		type: Types.Text,
		label: 'Key',
		index: true
	},
	position: {
		type: Types.Select,
		label: 'Position',
		options: settings.navigations,
		index: true,
		initial: true,
		note: add_item
	}
});

Menu.relationship({ ref: 'MenuItem', path: 'items', refPath: 'menu' });

if (settings.i18n.enable) {
	Menu.add({
		language: {
			type: Types.Select,
			label: 'Language',
			options: _.map(settings.i18n.languages, function(v, k) { return { value: k, label: v }; }),
			index: true,
			initial: true
		}
	});
}

Menu.defaultColumns = 'name, position|20%';

Menu.register();


var MenuItem = new keystone.List('MenuItem', {
	map: { name: 'label' },
	autokey: { path: 'key', from: 'label', unique: true },
	path: 'menu-items',
	label: 'Items',
	singular: 'Menu item',
	plural: 'Menu items',
	sortable: true,
	drilldown: 'menu'
});

MenuItem.add({
	menu: {
		type: Types.Relationship,
		label: 'Menu',
		ref: 'Menu',
		initial: true
	},
	label: {
		type: Types.Text,
		label: 'Label',
		required: true,
		initial: true
	},
	page: {
		type: Types.Relationship,
		label: 'Page',
		ref: 'Page',
		initial: true,
		dependsOn: { 'hasUrl': false }
	},
	hasUrl: {
		type: Types.Boolean,
		label: 'Custom URL',
		value: 'checked',
		default: false,
		initial: true
	},
	url: {
		type: Types.Url,
		label: 'URL',
		initial: true,
		dependsOn: { 'hasUrl': true }
	},
	title: {
		type: Types.Text,
		label: 'Title',
		note: add_subitem
	},
	item: {
		type: Types.Relationship,
		ref: 'MenuItem',
		label: 'Parent',
		hidden: true
	}
});

MenuItem.schema.virtual('href').get(function() {
	var _url = '#';

	if (this.hasUrl) {
		_url = this.url;
	} else {
		_url = this.page.url;
	}

	return _url;
});

MenuItem.relationship({ ref: 'Menu', path: 'menu', refPath: 'items' });

MenuItem.defaultColumns = 'label, menu|10%, item';

MenuItem.schema.post('save', function() {
  console.log('Save menu item');
});

MenuItem.register();


var SubMenuItem = new keystone.List('SubMenuItem', {
	inherits: MenuItem,
	path: 'submenu-items',
	label: 'Sub-menu items',
	singular: 'Sub-menu item',
	plural: 'Sub-menu items',
	drilldown: 'item',
	sortable: true
});

SubMenuItem.add({
	item: {
		type: Types.Relationship,
		ref: 'MenuItem',
		label: 'Parent',
		required: true,
		initial: true
	}
});

SubMenuItem.register();