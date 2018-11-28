var keystone = require('keystone');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');


var PortfolioType = new keystone.List('PortfolioType', {
	map: { name: 'name' },
	autokey: { from: 'name', path: 'key', unique: true },
	path: 'portfolio-types',
	label: 'Types',
	singular: 'Project Type',
	plural: 'Project Types',
	sortable: true
});

PortfolioType.add({
	name: {
		type: Types.Text,
		label: 'Name',
		required: true
	},
	key: {
		type: Types.Text,
		label: 'Slug',
		index: true
	}
});

PortfolioType.relationship({ ref: 'Portfolio', path: 'types' });

if (settings.i18n.enable) {
	PortfolioType.add('Languages', helpers.addLanguageSupport(PortfolioType, settings.i18n.lists.PortfolioType));
}

PortfolioType.register();