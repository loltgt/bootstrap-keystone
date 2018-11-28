var keystone = require('keystone');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');


var BlogCategory = new keystone.List('BlogCategory', {
	map: { name: 'name' },
	autokey: { from: 'name', path: 'key', unique: true },
	path: 'blog-categories',
	label: 'Categories',
	singular: 'Post Category',
	plural: 'Post Categories',
	sortable: true
});

BlogCategory.add({
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

BlogCategory.relationship({ ref: 'Blog', path: 'categories' });

if (settings.i18n.enable) {
	BlogCategory.add('Languages', helpers.addLanguageSupport(BlogCategory, settings.i18n.lists.BlogCategory));
}

BlogCategory.register();