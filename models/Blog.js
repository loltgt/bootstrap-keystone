var keystone = require('keystone');
var i18next = require('i18next');
var _ = require('lodash');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var has_history = ('Blog' in settings.revisions) ? true : false;
var add_media = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/media\');">Add a new Media</a>';
var add_category = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/blog-categories\');">Create new Category</a>';


var Blog = new keystone.List('Blog', {
	map: { name: 'title' },
	autokey: { path: 'slug', from: 'title', unique: true },
	defaultSort: '-publishedDate',
	path: 'blog',
	label: 'Blog',
	singular: 'Post',
	plural: 'Posts',
	history: has_history
});

Blog.add({
	title: {
		type: Types.Text,
		label: 'Title',
		required: true
	},
	slug: {
		type: Types.Text,
		label: 'Slug',
		index: true
	},
	state: {
		type: Types.Select,
		label: 'State',
		options: [
			{ value: 'draft', label: 'Draft' },
			{ value: 'published', label: 'Published' },
			{ value: 'archived', label: 'Archived' }
		],
		default: 'draft',
		index: true
	},
	author: {
		type: Types.Relationship,
		label: 'Author',
		ref: 'User',
		index: true
	},
	publishedDate: {
		type: Types.Datetime,
		label: 'Published Date', 
		format: settings.date_format,
		default: Date.now,
		index: true,
		dependsOn: { 'state': 'published' }
	},
	content: {
		brief: {
			type: Types.Html,
			label: 'Preview',
			wysiwyg: true,
			height: 180
		},
		extended: {
			type: Types.Html,
			label: 'Content',
			wysiwyg: true,
			height: 360
		}
	},
	thumbnail: {
		type: Types.Relationship,
		label: 'Thumbnail',
		ref: 'Media',
		filters: { 'type': 'image' },
		many: true,
		index: true,
		note: add_media
	},
	categories: {
		type: Types.Relationship,
		label: 'Categories',
		ref: 'BlogCategory',
		many: true,
		note: add_category
	},
	tags: {
		type: Types.TextArray,
		label: 'Tags'
	}
});

if (settings.i18n.enable) {
	Blog.add('Languages', helpers.addLanguageSupport(Blog, settings.i18n.lists.Blog));	
}

if (settings.seo.enable) {
	Blog.add('SEO', helpers.addSeoSupport());
}

Blog.schema.methods.classes = function(classes) {
	var _defaults = ['post'];

	if (classes && typeof classes === 'object') {
		classes = _.union(classes, _defaults);
	} else {
		classes = _defaults;
	}

	return classes || _defaults;
};

Blog.schema.virtual('_view').get(function() {
	var self = this;
	var _view = '';
	var _path = '/blog/';
	var _slug = this.slug;
	var _i18n = (settings.i18n.enable && settings.i18n.default_locale);
	var _locales;
	var _locale = keystone.get('locale') || null;
	var _ym = helpers.getYearMonth(this.publishedDate);

	if (_i18n) {
		_locales = settings.i18n.locales;

		_.each(_locales, function(_locale, locale) {
			if (_locale === settings.i18n.default_locale) {
				_path = '/' + settings.i18n.paths.Blog[_locale] + '/' + _ym.y + '/' + _ym.m + '/';
				_slug += '/';
				_view += '<a href="' + _path + _slug + '" target="_blank">' + locale.toUpperCase() + '</a>';
			} else if (self['lang_' + _locale]) {
				_path = '/' + locale + '/' + settings.i18n.paths.Blog[_locale] + '/' + _ym.y + '/' + _ym.m + '/';

				if (self[_locale] && self[_locale].slug) {
					_slug = self[_locale].slug;
				}

				_slug += '/';
				_view += '<a href="' + _path + _slug + '" target="_blank">' + locale.toUpperCase() + '</a>';
			}
		});
	} else {
		_path += '/' + _ym.y + '/' + _ym.m + '/';
		_slug += '/';
		_view = '<a href="' + _path + _slug + '" target="_blank">&square;</a>';
	}

	return _view;
});

Blog.schema.virtual('url').get(function() {
	var _path = '/blog/';
	var _slug = this.slug;
	var _i18n = (settings.i18n.enable && settings.i18n.default_locale);
	var _locales;
	var _locale = keystone.get('locale') || null;
	var _isLocalized = this['lang_' + _locale] || false;
	var _ym = helpers.getYearMonth(this.publishedDate);

	if (_i18n) {
		_locales = _.invert(settings.i18n.locales);
		_path = '/' + settings.i18n.paths.Blog[_locale] + '/' + _ym.y + '/' + _ym.m + '/';

		if (_isLocalized && _locale !== settings.i18n.default_locale) {
			_path = '/' + _locales[_locale] + _path;

			if (this[_locale] && this[_locale].slug) {
				_slug = this[_locale].slug;
			}
		}
	} else {
		_path += '/' + _ym.y + '/' + _ym.m + '/';
	}

	_slug += '/';

	return _path + _slug;
});

Blog.schema.virtual('content.full').get(function() {
	return this.content.extended || this.content.brief;
});

Blog.schema.virtual('filters').get(function() {
	var _filters = null;

	if (this.categories && this.categories.length) {
		_filters = _.map(this.categories, 'key').join(' ');
	}

	return _filters;
});

Blog.defaultColumns = 'title, state|10%, author|10%, publishedDate|15%, _view|10%';

Blog.register();