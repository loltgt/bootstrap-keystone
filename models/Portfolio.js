var keystone = require('keystone');
var i18next = require('i18next');
var _ = require('lodash');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var has_history = ('Porfolio' in settings.revisions) ? true : false;
var add_media = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/media\');">Add a new Media</a>';
var add_type = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/portfolio-types\');">Create new Type</a>';
var grid_note = 'Numeric percent value - From 0 to 100';


var Portfolio = new keystone.List('Portfolio', {
	map: { name: 'title' },
	autokey: { path: 'slug', from: 'title', unique: true },
	defaultSort: '-publishedDate',
	path: 'portfolio',
	label: 'Portfolio',
	singular: 'Project',
	plural: 'Projects',
	history: has_history
});

Portfolio.add({
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
		html: {
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
	types: {
		type: Types.Relationship,
		label: 'Types',
		ref: 'PortfolioType',
		many: true,
		note: add_type
	},
	features: {
		type: Types.TextArray,
		label: 'Features'
	}
});

/*Portfolio.add('Grid', {
	grid: {
		hasGrid: {
			type: Types.Boolean,
			label: 'Enable grid',
			index: true
		},
		width: {
			type: Types.Number,
			label: 'Width',
			dependsOn: { 'grid.hasGrid': true },
			note: grid_note
		},
		height: {
			type: Types.Number,
			label: 'Height',
			dependsOn: { 'grid.hasGrid': true },
			note: grid_note
		}
	}
});*/

if (settings.i18n.enable) {
	Portfolio.add('Languages', helpers.addLanguageSupport(Portfolio, settings.i18n.lists.Portfolio));
}

Portfolio.schema.methods.classes = function(classes, grid) {
	var _defaults = ['porfolio'];

	if (classes && typeof classes === 'object') {
		classes = _.union(classes, _defaults);
	} else {
		classes = _defaults;
	}

	/*if (grid === true) {
		classes.push(settings.layout.grid_class);

		if (this.grid.hasGrid) {
			if (this.grid.width) {
				var _width = parseInt(this.grid.width);
				classes.push(settings.layout.grid_class_width_prefix + _width);
			}

			if (this.grid.height) {
				var _height = parseInt(this.grid.height);
				classes.push(settings.layout.grid_class_height_prefix + _height);
			}
		}
	}*/

	return classes;
};

Portfolio.schema.virtual('_view').get(function() {
	var self = this;
	var _view = '';
	var _path = '/portfolio/';
	var _slug = this.slug;
	var _i18n = (settings.i18n.enable && settings.i18n.default_locale);
	var _locales;
	var _locale = keystone.get('locale') || null;

	if (_i18n) {
		_locales = settings.i18n.locales;

		_.each(_locales, function(_locale, locale) {
			if (_locale === settings.i18n.default_locale) {
				_path = '/' + settings.i18n.paths.Portfolio[_locale] + '/';
				_slug += '/';
				_view += '<a href="' + _path + _slug + '" target="_blank">' + locale.toUpperCase() + '</a>';
			} else if (self['lang_' + _locale]) {
				_path = '/' + locale + '/' + settings.i18n.paths.Portfolio[_locale] + '/';

				if (self[_locale] && self[_locale].slug) {
					_slug = self[_locale].slug;
				}

				_slug += '/';
				_view += '<a href="' + _path + _slug + '" target="_blank">' + locale.toUpperCase() + '</a>';
			}
		});
	} else {
		_slug += '/';
		_view = '<a href="' + _path + _slug + '" target="_blank">&square;</a>';
	}

	return _view;
});

Portfolio.schema.virtual('url').get(function() {
	var _path = '/portfolio/';
	var _slug = this.slug;
	var _i18n = (settings.i18n.enable && settings.i18n.default_locale);
	var _locales;
	var _locale = keystone.get('locale') || null;
	var _isLocalized = this['lang_' + _locale] || false;

	if (_i18n) {
		_locales = _.invert(settings.i18n.locales);
		_path = '/' + settings.i18n.paths.Portfolio[_locale] + '/';

		if (_isLocalized && _locale !== settings.i18n.default_locale) {
			_path = '/' + _locales[_locale] + _path;

			if (this[_locale] && this[_locale].slug) {
				_slug = this[_locale].slug;
			}
		}
	}

	_slug += '/';

	return _path + _slug;
});

Portfolio.schema.virtual('filters').get(function() {
	var _filters = null;

	if (this.types && this.types.length) {
		_filters = _.map(this.types, 'key').join(' ');
	}

	return _filters;
});

Portfolio.defaultColumns = 'title, state|20%, content, author|20%, publishedDate|20%, _view|10%';

Portfolio.register();