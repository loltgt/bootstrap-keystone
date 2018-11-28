var keystone = require('keystone');
var i18next = require('i18next');
var _ = require('lodash');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var has_history = ('Page' in settings.revisions) ? true : false;
var add_slideshow = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/slideshows\');">Create a new slideshow</a>';


var Page = new keystone.List('Page', {
	map: { name: 'title' },
	autokey: { from: 'title', path: 'slug', unique: true },
	path: 'pages',
	label: 'Pages',
	singular: 'Page',
	plural: 'Pages',
	sortable: true,
	history: has_history
});

Page.add({
	title: {
		type: Types.Text,
		label: 'Title',
		initial: true
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
		default: true,
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
	template: {
		type: Types.Select,
		label: 'Template',
		options: settings.templates,
		index: true
	},
	heading: {
		type: Types.Relationship,
		label: 'Heading',
		ref: 'Slideshow',
		note: add_slideshow
	}
});

Page.relationship({
	ref: 'ChildPage',
	path: 'pages',
	refPath: 'parent'
});

if (settings.customizer.enable) {
	Page.add('Customize', {
		custom: {
			layout: {
				type: Types.Select,
				label: 'Layout (predefined)',
				options: settings.customizer.layouts,
				emptyOption: false
			},
			background: {
				type: Types.Color,
				label: 'Background Color'
			},
			foreground: {
				type: Types.Color,
				label: 'Foreground Color'
			}
		}
	});
}

if (settings.i18n.enable) {
	Page.add('Languages', helpers.addLanguageSupport(Page, settings.i18n.lists.Page));
}

if (settings.seo.enable) {
	Page.add('SEO', helpers.addSeoSupport());
}

Page.schema.virtual('_title').get(function() {
	var _child = this.parent || false;
	var _classes = _child ? 'child-page' : 'page';
	var _base = _child ? '/keystone/child-pages/' : '/keystone/pages/';
	var _name = this.title || '(no name)';

	return '<a class="' + _classes + '" href="' + _base + this.id + '">' + _name + '</a>';
});

Page.schema.virtual('_view').get(function() {
	var self = this
	var _view = '';
	var _child = this.parent || false;
	var _path = '/';
	var _slug = this.slug;
	var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
	var _locale = keystone.get('locale') || null;

	if (_child) {
		return;
	}

	if (_i18n) {
		var _locales = settings.i18n.locales;

		_.each(_locales, function(_locale, locale) {
			if (_locale === settings.i18n.default_locale) {
				_path = '/';
				_slug = (_slug === settings.homepage) ? '' : _slug + '/';
				_view += '<a href="' + _path + _slug + '" target="_blank">' + locale.toUpperCase() + '</a>';
			} else if (self['lang_' + _locale]) {
				_path = '/' + locale + '/';

				if (self[_locale] && self[_locale].slug) {
					_slug = self[_locale].slug;
				}

				_slug = (_slug === settings.homepage) ? '' : _slug + '/';
				_view += '<a href="' + _path + _slug + '" target="_blank">' + locale.toUpperCase() + '</a>';
			}
		});
	} else {
		_slug = (_slug === settings.homepage) ? '' : _slug + '/';
		_view = '<a href="' + _path + _slug + '" target="_blank">&square;</a>';
	}

	return _view;
});

Page.schema.virtual('url').get(function() {
	var _child = this.parent || false;
	var _path = '/';
	var _slug = this.slug;
	var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
	var _locale = keystone.get('locale') || null;
	var _isLocalized = this['lang_' + _locale] || false;

	// TODO implement child page

	if (_i18n) {
		var _locales = _.invert(settings.i18n.locales);

		if (_isLocalized && _locale !== settings.i18n.default_locale) {
			_path = '/' + _locales[_locale] + '/';

			if (this[_locale] && this[_locale].slug) {
				_slug = this[_locale].slug;
			}
		}
	}

	_slug = (_slug === settings.homepage) ? '' : _slug + '/';

	return _path + _slug;
});

Page.schema.add({
	attributes: {},
	custom: {
		wide: false
	}
});

Page.defaultColumns = 'title, state|10%, author|10%, publishedDate|15%, _view|10%';

Page.schema.post('save', function() {
	var _nginx = (settings.nginx && settings.nginx.enable) || false;
	var _cache = (settings.nginx.cache && settings.nginx.cache.enable) || false;

	if (_nginx && _cache) {
		var self = this;
		var _urls = [];
		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locale = keystone.get('locale') || null;
		var _isLocalized = this['lang_' + _locale] || false;

		if (_i18n && _isLocalized) {
			var _locales = settings.i18n.locales;

			_.each(_locales, function(_locale, locale) {
				keystone.set('locale', _locale);
				_urls.push(self.url);
			});
		} else {
			_urls.push(this.url);
		}

		var http = require('http');

		var _hostname = (settings.nginx.hostname && typeof settings.nginx.hostname === 'string') ? settings.nginx.hostname : 'localhost';
		var _port = (settings.nginx.port && typeof settings.nginx.port === 'number') ? settings.nginx.port : 3000;
		var _headers = (settings.nginx.cache.bypass_headers && typeof settings.nginx.cache.bypass_headers === 'object') ? settings.nginx.cache.bypass_headers : {};

		var _options = {
			'hostname': _hostname,
			'port': _port,
			'method': 'GET',
			'headers': _headers
		};

		if (settings.debug) {
			console.log('bkjs.helpers.webServerCache():', _urls, _options);
		}

		_urls.forEach(function(url) {
			_options.path = url;

			http.get(_options, function(res) {
				if (settings.debug) {
					console.log('bkjs.helpers.webServerCache():', 'STATUS', res.statusCode);
					console.log('bkjs.helpers.webServerCache():', 'HEADERS', JSON.stringify(res.headers));
				}

				res.resume();
			}).on('error', function(err) {
				if (settings.debug) {
					console.log('bkjs.helpers.webServerCache():', 'ERROR', JSON.stringify(err.message));
				}
			});

			_options.headers = {};

			http.get(_options, function(res) {
				if (settings.debug) {
					console.log('bkjs.helpers.webServerCache():', 'STATUS', res.statusCode);
					console.log('bkjs.helpers.webServerCache():', 'HEADERS', JSON.stringify(res.headers));
				}

				res.resume();
			}).on('error', function(err) {
				if (settings.debug) {
					console.log('bkjs.helpers.webServerCache():', 'ERROR', JSON.stringify(err.message));
				}
			});
		});
	}
});

Page.register();


var ChildPage = new keystone.List('ChildPage', {
	inherits: Page,
	path: 'child-pages',
	label: 'Child pages',
	singular: 'Page',
	plural: 'Pages'
});

ChildPage.add('Relationships', {
	parent: {
		type: Types.Relationship,
		label: 'Parent',
		ref: 'Page',
		many: true,
		required: true,
		initial: true
	},
	singular: {
		type: Types.Boolean,
		label: 'Singular view',
		default: false,
		index: true,
		initial: true
	}
});

ChildPage.defaultColumns = 'title, parent|10%, state|10%, author|10%, publishedDate|15%';

ChildPage.register();