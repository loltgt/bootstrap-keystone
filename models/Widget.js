var keystone = require('keystone');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var editable_areas = (! settings.widgets.editable_areas);
var add_widget = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/widgets\');">Create new Widget</a>';
var key_note = 'Add an alphanumeric name for the widget to facilitate his recognition.';


var WidgetArea = new keystone.List('WidgetArea', {
	map: { name: 'name' },
	autokey: { from: 'name', path: 'key', unique: true },
	path: 'widgets',
	label: 'Areas',
	singular: 'Widget Area',
	plural: 'Widget Areas',
	nocreate: editable_areas,
	nodelete: editable_areas
});

WidgetArea.add({
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
	title: {
		type: Types.Text,
		label: 'Title',
		initial: true
	},
	widgets: {
		type: Types.Relationship,
		label: 'Widgets',
		ref: 'Widget',
		many: true,
		note: add_widget
	}
});

if (settings.i18n.enable) {
	WidgetArea.add('Languages', helpers.addLanguageSupport(WidgetArea, settings.i18n.lists.WidgetArea));
}

WidgetArea.defaultColumns = 'name|20%, key|20%, widgets';

WidgetArea.register();


var Widget = new keystone.List('Widget', {
	map: { name: 'key' },
	path: 'widgets-manager',
	label: 'Widgets',
	singular: 'Widget',
	plural: 'Widgets'
});

Widget.add({
	key: {
		type: Types.Key,
		label: 'Name',
		index: true,
		required: true,
		initial: true,
		note: key_note
	},
	title: {
		type: Types.Text,
		label: 'Title',
		initial: true
	},
	content: {
		type: Types.Html,
		label: 'Content',
		wysiwyg: true,
		height: 240,
		initial: true
	}
});

Widget.relationship({ ref: 'WidgetArea', path: 'widgets' });

if (settings.i18n.enable) {
	Widget.add('Languages', helpers.addLanguageSupport(Widget, settings.i18n.lists.Widget));
}

Widget.defaultColumns = 'key, title';

Widget.register();