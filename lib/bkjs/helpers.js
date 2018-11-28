var keystone = require('keystone');
var i18next = require('i18next');
var _ = require('lodash');
var fs = require('fs');
var sharp = require('sharp');
var async = require('async');
var utils = require('keystone-utils');
var Types = keystone.Field.Types;
var settings = keystone.get('settings');


module.exports = {


	/**
	 * Locale route
	 * TODO improve
	 *
	 * @param Object - req
	 * @param Object - res
	 * @param Function - next(err)
	 */
	localeRoute: function(req, res, next) {
		//TODO improve
		if (/^\/(uploads|assets)/i.test(req.path)) {
			return next();
		}

		var lang = Object.keys(settings.i18n.locales).join('|');
		var default_locale = settings.i18n.default_locale;
		var current_lang = req.cookies.language;
		var locale = default_locale;
		lang = new RegExp('^\/(' + lang + ')', 'i');

		res.locals.default_locale = true;

		if (lang.test(req.url)) {
			var locale = lang.exec(req.url);

			if (locale[1]) {
				req.url = req.url.replace('/' + locale[1], '');
				//res.locals.absoluteUrl = res.locals.absoluteBasePath + req.path.replace('/' + locale[1]);
				locale = settings.i18n.locales[locale[1]];
			}
		}

		res.locals.locale = locale;

		if (locale !== default_locale) {
			res.locals.default_locale = false;
		}

		if (settings.debug) {
			console.log('bkjs.helpers.localeRoute():', req.url, locale);
		}

		i18next.changeLanguage(locale, function(err, t) {
			keystone.set('locale', locale);

			next();
		});
	},


	/**
	 * Fixs keyston.list.selectColumns() function to populate virtual schema with dependencies
	 * Specified select and populate options for a query based the provided columns.
	 *
	 * @param Object - query
	 * @param Array - columns
	 */
	listSelectColumns: function(q, cols) {
		var list = this;
		var paths = [];
		var select = [];
		var populate = {};
		var path;

		cols.forEach(function(col) {
			var virtual = list.model.schema.virtuals[col.path];

			if (virtual && virtual.depends) {
				paths = paths.concat(list.expandColumns(virtual.depends));
			}

			if (col.populate) {
				if (! populate[col.populate.path]) {
					populate[col.populate.path] = [];
				}
				populate[col.populate.path].push(col.populate.subpath);
			}

		});

		paths.forEach(function(path) {
			select.push(path['path']);
		});

		q.select(select.join(' '));

		for (path in populate) {
			if (populate.hasOwnProperty(path)) {
				q.populate(path, populate[path].join(' '));
			}
		}

		return q;
	},


	/**
	 * Checks if file exists
	 *
	 * @param String - path
	 * @return Mixed - String/Boolean
	 */
	fileExists: function(path) {
		try {
			return fs.realpathSync(path);
		} catch(err) {
			return false;
		}
	},


	/**
	 * Gets the file extension from filename
	 *
	 * @param String - filename
	 * @return String - filename
	 */
	getFileExtension: function(filename) {
		if (filename) {
			var extension = filename.substr(0, filename.lastIndexOf('.'));

			if (extension) {
				return extension;
			}
		}

		return '';
	},


	/**
	 * Gets the next count integer
	 *
	 * @param Object - list
	 * @param Object - item
	 * @param String - field
	 * @param Function - callback(err, count)
	 */
	getUpdateCount: function(list, item, field, callback) {
		if (! list && typeof list !== 'object') {
			throw new Error('bkjs.helpers.getUpdateCount(): Wrong \'list\' argument object');
		}

		if (! 'model' in list) {
			throw new Error('bkjs.helpers.getUpdateCount(): Missing \'model\' property into \'list\' object');
		}

		if (! item && typeof item !== 'object') {
			throw new Error('bkjs.helpers.getUpdateCount(): Wrong \'item\' argument object');
		}

		if (! '_id' in item) {
			throw new Error('bkjs.helpers.getUpdateCount(): Missing \'_id\' property into \'item\' object');
		}

		if (! field && typeof field !== 'string') {
			throw new Error('bkjs.helpers.getUpdateCount(): Wrong \'field\' argument string');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getUpdateCount(): Wrong \'callback\' argument function');
		}

		var count = 0;

		var _find_by = {};
		_find_by[field] = 1;

		list.model.findByIdAndUpdate(item._id, {
			$inc: _find_by,
			'new': true,
			'upsert': false
		}, function(err, result) {
			if (err) {
				return callback(err);
			}

			if (result && result[field]) {
				count = (parseInt(result[field]) - 1);
			}

			callback(err, count);
		});
	},


	/**
	 * Gets the last counter integer
	 *
	 * @param Object - list
	 * @param Object - item
	 * @param String - field
	 * @param Function - callback(err, guid)
	 */
	getLastCount: function(list, item, field, callback) {
		if (! list && typeof list !== 'object') {
			throw new Error('bkjs.helpers.getLastCount(): Wrong \'list\' argument object');
		}

		if (! 'model' in list) {
			throw new Error('bkjs.helpers.getLastCount(): Missing \'model\' property into \'list\' object');
		}

		if (! item && typeof item !== 'object') {
			throw new Error('bkjs.helpers.getLastCount(): Wrong \'item\' argument object');
		}

		if (! '_id' in item) {
			throw new Error('bkjs.helpers.getLastCount(): Missing \'_id\' property into \'item\' object');
		}

		if (! field && typeof field !== 'string') {
			throw new Error('bkjs.helpers.getLastCount(): Wrong \'field\' argument string');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getLastCount(): Wrong \'callback\' argument function');
		}

		var count = 0;

		var _sort_by = {};
		_sort_by[field] = -1;

		list.model.findOne()
		.sort(_sort_by)
		.select(field)
		.exec(function(err, result) {
			if (err) {
				return callback(err);
			}

			if (result && result[field]) {
				count = parseInt(result[field]);
			}

			callback(err, count);
		});
	},


	/**
	 * Convert an hexadecimal color value to rgb
	 *
	 * Source: http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
	 *
	 * @param String - hex
	 * @return Object - rgb
	 */
	hexToRgb: function(hex) {
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

		hex = hex.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	},


	/**
	 * Registers async helper
	 *
	 * @param String - name
	 * @param Object - locals
	 * @param Function - fn
	 */
	registerHandlebarsSyncHelper: function(name, locals, callback) {
		if (! name && typeof name !== 'string') {
			throw new Error('bkjs.helpers.registerHandlebarsSyncHelper(): Wrong \'name\' argument string');
		}

		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.registerHandlebarsSyncHelper(): Wrong \'locals\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.registerHandlebarsSyncHelper(): Wrong \'callback\' argument function');
		}

		if (! 'handlebars' in locals) {
			throw new Error('bkjs.helpers.registerHandlebarsAsyncHelper(): Handlebars was not loaded');
		}

		locals.handlebars.registerHelper.apply(locals.handlebars, [name, callback]);
	},


	/**
	 * Registers async helper
	 *
	 * @param String - name
	 * @param Object - locals
	 * @param Function - callback
	 */
	registerHandlebarsAsyncHelper: function(name, locals, callback) {
		if (! name && typeof name !== 'string') {
			throw new Error('bkjs.helpers.registerHandlebarsAsyncHelper(): Wrong \'name\' argument string');
		}

		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.registerHandlebarsAsyncHelper(): Wrong \'locals\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.registerHandlebarsAsyncHelper(): Wrong \'callback\' argument function');
		}

		if (! 'handlebars' in locals) {
			throw new Error('bkjs.helpers.registerHandlebarsAsyncHelper(): Handlebars was not loaded');
		}

		if (! 'waiter' in locals) {
			throw new Error('bkjs.helpers.registerHandlebarsAsyncHelper(): Waiter was not loaded');
		}

		locals.handlebars.registerHelper(name, function(context) {
			return locals.waiter.resolve(callback.bind(this), context);
		});
	},


	/**
	 * Creates a generic handlebars element
	 *
	 * @param Object - locals
	 * @param Object - context
	 * @param Object - options
	 * @return String - result
	 */
	genericHandlebarsElement: function(locals, context, options) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.genericHandlebarsElement(): Wrong \'locals\' argument object');
		}

		if (! context && typeof context !== 'object') {
			throw new Error('bkjs.helpers.genericHandlebarsElement(): Wrong \'context\' argument object');
		}

		if (! 'hash' in context) {
			throw new Error('bkjs.helpers.genericHandlebarsElement(): Missing \'hash\' property into \'context\' object');
		}

		if (! options && typeof options !== 'object') {
			throw new Error('bkjs.helpers.genericHandlebarsElement(): Wrong \'options\' argument object');
		}

		if (! 'handlebars' in locals) {
			throw new Error('bkjs.helpers.genericHandlebarsElement(): Handlebars was not loaded');
		}

		var _defaults = {
			'type': 'div',
			'wrap': false,
			'id': '',
			'class': '',
			'rel': '',
			'itemprop': '',
			'itemscope': '',
			'itemtype': '',
			'aria': '',
			'data': ''
		};

		var _layout = locals.layout;

		var _options = _.defaults(context.hash, options, _defaults);
		var result = '';
		var tag = locals.handlebars.Utils.escapeExpression(_options.type);
		var classes = [];

		if (typeof _options['class'] === 'object') {
			classes = _options['class'];
		} else {
			classes = locals.handlebars.Utils.escapeExpression(_options.class).split(' ') || [];
		}

		result += '<' + tag;
		result += (! _options.id) ? '' : ' id="' + locals.handlebars.Utils.escapeExpression(_options.id) + '"';
		result += (! classes.length) ? '' : ' class="' + classes.join(' ') + '"';
		result += (! _options.rel) ? '' : ' rel="'  + locals.handlebars.Utils.escapeExpression(_options.rel) + '"';
		result += (! _options.itemprop) ? '' : ' itemprop="' + locals.handlebars.Utils.escapeExpression(_options.itemprop) + '"';
		result += (! _options.itemscope) ? '' : ' itemscope';
		result += (! _options.itemtype) ? '' : ' itemtype="' + locals.handlebars.Utils.escapeExpression(_options.itemtype.trim) + '"';
		result += (! _options.aria) ? '' : ' ' + locals.handlebars.Utils.escapeExpression(_options.itemtype.aria);
		result += (! _options.data) ? '' : ' ' + locals.handlebars.Utils.escapeExpression(_options.data);
		result += '>';

		if (_options.wrap) {
			result += _options.wrap.replace(/\.\*/, context.fn(this));
		} else {
			result += context.fn(this);
		}

		result += '<\/' + tag + '>';

		return result || '';
	},


	/**
	 * Gets homepage link
	 *
	 * @param Object - locals
	 * @param Boolean - absolute
	 * @param Function - callback(err, meta)
	 */
	getHomePageLink: function(locals, absolute, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.getHomePageLink(): Wrong \'locals\' argument object');
		}

		if (! absolute && typeof absolute !== 'boolean') {
			throw new Error('bkjs.helpers.getHomePageLink(): Wrong \'absolute\' argument boolean');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getHomePageLink(): Wrong \'callback\' argument function');
		}

		var _basePath = absolute ? locals.absoluteBasePath : '';
		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locale = locals.locale || null;
		var _locales = _.invert(settings.i18n.locales);

		var home = '/';

		// i18n
		if (_i18n && ! locals.default_locale && _locales[_locale]) {
			home += _locales[_locale] + '/';
		}

		return callback(null, _basePath + home);
	},


	/**
	 * Gets alternate links
	 *
	 * @param Object - locals
	 * @param String/Object - data
	 * @param Boolean - absolute
	 * @param Function - callback(err, meta)
	 */
	getAlternate: function(locals, data, absolute, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.getAlternate(): Wrong \'locals\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getAlternate(): Wrong \'callback\' argument function');
		}

		if (typeof data === 'string') {
			data = _.get(locals, data);
		} else if (typeof data === 'object') {
			data = _.isEmpty(data) ? false : data;
		} else {
			throw new Error('bkjs.helpers.getAlternate(): Wrong \'data\' argument, expected type string or object');
		}

		if (! data || typeof data !== 'object') {
			throw new Error('bkjs.helpers.getAlternate(): Missing data object');
		}

		var self = this;
		var alternate = {};

		var _basePath = absolute ? locals.absoluteBasePath : '';
		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;

		if (_i18n) {
			var _locale = locals.locale || null;
			var _locales = settings.i18n.locales;
			var _languages = settings.i18n.languages;

			_.each(_locales, function(_locale, locale) {
				var _child = data.parent || false;
				var _path = '/';
				var _slug = data.slug;

				// TODO implement child page

				switch (locals.list) {
					case 'Blog':
						var _ym = self.getYearMonth(data.publishedDate);
						_path += _ym.y + '/' + _ym.m + '/';
					case 'Portfolio':
						_path = '/' + settings.i18n.paths[locals.list][_locale] + _path;
					break;
				}

				if (_locale !== settings.i18n.default_locale) {
					if (data['lang_' + _locale]) {
						if (data[_locale] && data[_locale].slug) {
							_path = '/' + locale + _path;
							_slug = data[_locale].slug;
						}
					} else {
						return;
					}
				}

				if (locals.list === 'Page' && _slug === settings.homepage) {
					_slug = '';
				} else {
					_slug += '/';
				}

				alternate[_locale] = {
					'locale': _locale.replace('_', '-'),
					'title': _languages[_locale],
					'href': _basePath + _path + _slug
				};
			});
		}

		if (settings.debug) {
			console.log('bkjs.helpers.getAlternate():', alternate);
		}

		return callback(null, alternate);
	},


	/**
	 * Parses title, description, etc. for SEO and localization
	 *
	 * @param Object - locals
	 * @param String/Object - data
	 * @param String/Object - paginate
	 * @param Function - callback(err, meta)
	 */
	parserMeta: function(locals, data, paginate, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.parserMeta(): Wrong \'locals\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.parserMeta(): Wrong \'callback\' argument function');
		}

		var meta = locals.meta || {};

		if (typeof data === 'string') {
			data = _.get(locals, data);
		} else if (typeof data === 'object') {
			data = _.isEmpty(data) ? false : data;
		} else {
			throw new Error('bkjs.helpers.parserMeta(): Wrong \'data\' argument, expected type string or object');
		}

		if (! data || typeof data !== 'object') {
			throw new Error('bkjs.helpers.parserMeta(): Missing data object');
		}

		var prefixes = [];
		var site_name = settings.seo.site_name || locals.title || keystone.get('brand');
		var separator = (settings.seo.separator && typeof settings.seo.separator === 'string') ? settings.seo.separator : ' - ';
		var reverse = false;
		var title = null;
		var description = null;
		var category = undefined;
		var tag = undefined;
		var keywords_data = null;
		var sections_data = null;
		var images_data = null;
		var image = {};
		var images = [];
		var published_date = false;
		var force_images = settings.seo.force_images || false;

		var _isSeoEnabled = data.seo || false;
		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locale = locals.locale || null;
		var _isLocalized = data['lang_' + _locale] || false;

		var _url = ['slug', 'url'];
		var _title = ['meta.title', 'title'];
		var _description = ['meta.description'];
		var _keywords = ['meta.keywords'];
		var _author = 'author';
		var _published_date = 'publishedDate';
		var _sections = false;
		var _images = ['meta.thumbnail', 'thumbnail'];

		meta.metaTags = {};
		meta.linkTags = {};

		switch (locals.template) {
			case 'cards':
			case 'portfolio':
			case 'page':
				_description[1] = 'content.html';
			break;

			case 'post':
				_description[1] = 'content.brief';
				_keywords[1] = 'tags';
				_sections = 'categories';
				published_date = true;
				force_images = true;
				reverse = true;
			break;

			case 'project':
				_description[1] = 'content.html';
				_sections = 'types';
				published_date = true;
				force_images = true;
				reverse = true;
			break;
		}

		if (locals.data.category || locals.data.tag || locals.data.type) {
			switch (locals.template) {
				case 'cards':
					category = locals.data.category;
					tag = locals.data.tag;
				break;

				case 'portfolio':
					category = locals.data.type;
				break;
			}
		}

		// i18n
		if (_i18n && _isLocalized && ! locals.default_locale) {
			if (settings.seo.enable && _isSeoEnabled) {
				title = this.translate(data, _locale, _title[0], true);
				description = this.translate(data, _locale, _description[0], true);
			}

			if (! title && _title[1]) {
				title = this.translate(data, _locale, _title[1], true);
			}

			if (! description && _description[1]) {
				description = this.translate(data, _locale, _description[1], true);
				description = utils.htmlToText(description);
				description = utils.cropString(description, 90, '...', true);
			}
		// default locale
		} else {
			if (settings.seo.enable && _isSeoEnabled) {
				title = data.get(_title[0]);
				description = data.get(_description[0]);
			}

			if (! title && _title[1]) {
				title = data.get(_title[1]);
			}

			if (! description && _description[1]) {
				description = data.get(_description[1]);
				description = utils.htmlToText(description);
				description = utils.cropString(description, 90, '...', true);
			}
		}

		// formatting title
		if (title) {
			title = utils.cropString(title, 70, '...', true);

			if (reverse) {
				meta.title = title + separator + site_name;
			} else {
				meta.title = site_name + separator + title;
			}
		} else {
			meta.title = site_name;
		}

		// formatting description
		if (description) {
			description = description.replace(/(\t)/gm, '').replace(/(\r\n|\n|\r)/gm, ', ');

			if (settings.parse_handlebars) {
				description = description.replace(/{{\/?#?[^{}]+}}/g, '');
			}

			if (description) {
				meta.description = description;
			}
		}

		// set locals.title
		locals.title = meta.title || brand;

		// alternate
		if (locals.data.alternate) {
			_.each(locals.data.alternate, function(lang, key) {
				meta.linkTags['alternate_' + key] = {
					'rel': 'alternate',
					'hreflang': lang.locale,
					'href': lang.href,
					'title': lang.title
				};
			});
		}

		// seo
		if (! settings.seo.enable) {
			meta.seoEnabled = false;
			return callback(null, meta);
		} else {
			meta.seoEnabled = true;
		}

		// i18n
		if (_i18n && _isLocalized && ! locals.default_locale) {
			if (settings.seo.keywords_support) {
				if (_isSeoEnabled) {
					keywords_data = this.translate(data, _locale, _keywords[0], true);
				}

				if (! keywords_data && _keywords[1]) {
					keywords_data = this.translate(data, _locale, _keywords[1], true);
				}
			}

			if (_sections) {
				sections_data = this.translate(data, _locale, _sections, true);
			}

			if (settings.seo.images_support) {
				if (_isSeoEnabled) {
					images_data = this.translate(data, _locale, _images[0], true);
				}

				if (! images_data && _images[1]) {
					images_data = this.translate(data, _locale, _images[1], true);
				}
			}
		// default locale
		} else {
			if (settings.seo.keywords_support) {
				if (_isSeoEnabled) {
					keywords_data = data.get(_keywords[0]);
				}

				if (! keywords_data && _keywords[1]) {
					keywords_data = data.get(_keywords[1]);
				}
			}

			if (_sections) {
				sections_data = data.get(_sections);
			}

			if (settings.seo.images_support) {
				if (_isSeoEnabled) {
					images_data = data.get(_images[0]);
				}

				if (! images_data && _images[1]) {
					images_data = data.get(_images[1]);
				}
			}
		}

		// category and tag
		if (category || tag) {
			if (_i18n) {
				if (category && typeof category === 'object' && category.name) {
					meta.title += separator;
					meta.title += locals.t('categoryMetaTitle', { postProcess: 'sprintf', sprintf: [ category.name ], defaultValue: 'Category: ' + category.name });
				}

				if (tag && typeof tag === 'string') {
					meta.title += separator;
					meta.title += locals.t('tagMetaTitle', { postProcess: 'sprintf', sprintf: [ tag ], defaultValue: 'Tag: ' + tag });
				}
			// default locale
			} else {
				if (category && typeof category === 'object' && category.name) {
					meta.title += separator + 'Category: ' + category.name;
				}

				if (tag && typeof tag === 'string') {
					meta.title += separator + 'Tag: ' + tag;
				}
			}
		}

		// formatting keywords
		if (settings.seo.keywords_support && keywords_data) {
			var separator = (settings.seo.keywords_separator && typeof settings.seo.keywords_separator === 'string') ? settings.seo.keywords_separator : ', ';

			if (typeof keywords_data === 'object' && keywords_data.length) {
				meta.keywords = keywords_data.join(separator).toLowerCase();
			}
		}

		// canonical url
		if (locals.data.uri) {
			meta.linkTags.canonical = {
				'rel': 'canonical',
				'href': locals.data.uri
			}
		}

		// paginate urls
		if (paginate) {
			if (typeof paginate === 'string') {
				paginate = _.get(locals, paginate);
			} else if (typeof paginate === 'object') {
				paginate = _.isEmpty(paginate) ? false : paginate;
			} else {
				throw new Error('bkjs.helpers.parserMeta(): Wrong \'paginate\' argument, expected type string or object');
			}

			if (! paginate || typeof paginate !== 'object') {
				throw new Error('bkjs.helpers.parserMeta(): Wrong paginate object');
			}
			
			//TODO
		}


		// preparing images
		if (settings.seo.images_support) {
			if (! images_data && force_images && typeof settings.seo.default_image === 'object') {
				images_data = [settings.seo.default_image];	
			}

			var step = false;
			var thumbnail_size = false;

			if (settings.thumbnails && settings.thumbnails.enable && settings.thumbnails.sizes) {
				if (
					typeof settings.thumbnails.size === 'object' &&
					typeof settings.seo.thumbnail_sizes === 'string' &&
					settings.seo.thumbnail_size in settings.thumbnails.sizes
				) {
					thumbnail_size = settings.seo.thumbnail_size;
				}
			}

			_.each(images_data, function(media, i) {
				var img, src, type, w, h, step;

				if (typeof media === 'array') {
					img = media;
					src = img.src;
					type = img.filetype || null;
					w = img.width || null; 
					h = img.height || null;

					if (src) {
						src = locals.absoluteBasePath + src;

						if (! step) {
							image.normal = src;
							image.thumbnail = false;
						}

						images[i] = {
							'src': src,
							'type': type,
							'width': w,
							'height': h
						};
					}

					step = true;

					return;
				} else if (media.type === 'image') {
					if (media.image.landscape && media.image.landscape.exists) {
						img = media.image.landscape;
						type = img.filetype || null;

						if (thumbnail_size && media.hasThumbnail) {
							src = img.thumb(thumbnail_size);
							w = settings.thumbnails.sizes[thumbnail_size].width;
							h = settings.thumbnails.sizes[thumbnail_size].height;

							if (src) {
								src = locals.absoluteBasePath + src;

								if (! step) {
									image.thumbnail = src;
								}

								images[i] = {
									'src': src,
									'type': type,
									'width': w,
									'height': h
								};
							}
						} else {
							src = img.href;
							//TODO
							w = null;
							h = null;

							if (src) {
								src = locals.absoluteBasePath + src;

								if (! step) {
									image.normal = src;
								}

								images[i] = {
									'src': src,
									'type': type,
									'width': w,
									'height': h
								};
							}
						}

						step = true;
					}

					if (media.image.portrait && media.image.portrait.exists) {
						img = media.image.portrait;
						type = img.filetype || null;

						if (thumbnail_size && media.hasThumbnail) {
							src = img.thumb(thumbnail_size);
							w = settings.thumbnails.sizes[thumbnail_size].width;
							h = settings.thumbnails.sizes[thumbnail_size].height;

							if (src) {
								src = locals.absoluteBasePath + src;

								if (! step) {
									image.thumbnail = src;
								}

								images[i] = {
									'src': src,
									'type': type,
									'width': w,
									'height': h
								};
							}
						} else {
							src = img.href;
							//TODO
							w = null;
							h = null;

							if (src) {
								src = locals.absoluteBasePath + src;

								if (! step) {
									image.normal = src;
								}

								images[i] = {
									'src': src,
									'type': type,
									'width': w,
									'height': h
								};
							}
						}

						step = true;
					}

					return;
				} else if (media.type === 'video' && media.video) {
					if (media.video.poster.exists) {
						img = media.video.poster;
						src = img.href;
						type = img.filetype || null;

						if (src) {
							src = locals.absoluteBasePath + src;
							

							if (! step) {
								image.normal = src;
								image.thumbnail = false;
							}

							images[i] = {
								'src': src,
								'type': type,
								'width': w,
								'height': h
							};
						}

						step = true;
					}

					return;
				}
			});
		}

		// schema.org support
		if (settings.seo.providers && settings.seo.providers['schema.org']) {
			var blob = {};
			blob['title'] = title;
			blob['description'] = description;

			if (image && image.normal) {
				blob['image'] = image.normal;
			}

			if (image && image.thumbnail) {
				blob['thumbnailUrl'] = image.thumbnail;
			}

			_.each(blob, function(value, key) {
				if (! value) {
					return;
				}

				var index = key;

				if (index.match(/\d/)) {
					key = index.replace(/\d/, '');
					index = index.replace(':', '_') + '_' + index.match(/\d/)[0];
				}

				meta.metaTags['SchemaOrg_' + index] = {
					'itemprop': key,
					'content': value
				};
			});
		}

		// opengraph support
		if (settings.seo.providers && settings.seo.providers.opengraph) {
			var blob = {};
			blob['og:locale'] = locals.locale || settings.i18n.default_locale;
			blob['og:type'] = locals.type || 'page';
			blob['og:title'] = null;
			blob['og:description'] = null;
			blob['og:url'] = locals.data.uri || null;
			blob['og:site_name'] = site_name;

			if (settings.seo.custom && settings.seo.custom.opengraph && _isSeoEnabled && data.seo.opengraph_custom) {
				if (_i18n && _isLocalized && ! locals.default_locale) {
					blob['og:title'] = this.translate(data, _locale, 'seo.opengraph_title', true);
					blob['og:description'] = this.translate(data, _locale, 'seo.opengraph_description', true);
					blog['article:author'] = this.translate(data, _locale, 'seo.opengraph_author', true);
				} else {
					blob['og:title'] = data.seo.opengraph_title;
					blob['og:description'] = data.seo.opengraph_description;
					blob['article:author'] = data.seo.opengraph_author;
				}
			}

			if (blob['og:title']) {
				blob['og:title'] = utils.cropString(og.title, 70, '...', true);
			} else {
				blob['og:title'] = title;
			}

			if (blob['og:description']) {
				blob['og:description'] = utils.cropString(og.description, 90, '...', true);
			} else {
				blob['og:description'] = description;
			}

			if (images && typeof images === 'object' && images.length) {
				images.forEach(function(image, i) {
					blob['og:image' + i] = image.src;

					if (image.width) {
						blob['og:image' + i + ':width'] = image.width;
					}

					if (image.height) {
						blob['og:image' + i + ':height'] = image.height;
					}
				});
			}

			if (! blob['article:publisher'] && settings.facebook && settings.facebook.publisher) {
				var publisher = settings.facebook.publisher;

				//TODO validate url
				blob['article:publisher'] = publisher;
			}

			//TODO extend User model
			/*if (! blob['article:author']) {
				var author = data.get(_author);

				if (author) {
					blob['article:author'] = author;
				}
			}*/

			if (keywords_data && typeof keywords_data === 'object' && keywords_data.length) {
				keywords_data.forEach(function(keyword, i) {					
					blob['article:tag' + i] = keyword;
				});
			}

			if (sections_data && typeof sections_data === 'object' && sections_data.length) {
				sections_data.forEach(function(section, i) {
					blob['article:section' + i] = section.name;
				});
			}

			if (published_date) {
				var date = data.get(_published_date);

				if (typeof date === 'object') {
					date = date.toISOString();
				}

				if (date) {
					blob['article:published_time'] = date;
				}
			}

			_.each(blob, function(value, key) {
				if (! value) {
					return;
				}

				var index = key;

				if (index.match(/\d/)) {
					key = index.replace(/\d/, '');
					index = index.replace(':', '_') + '_' + index.match(/\d/)[0];
				}

				meta.metaTags['OpenGraph_' + index] = {
					'property': key,
					'content': value
				};
			});

			prefixes.push('og: http://ogp.me/ns#');
			prefixes.push('article: http://ogp.me/ns/article#');
		}

		// facebook support
		if (settings.facebook) {
			if (settings.facebook.app_id) {
				meta.metaTags['Facebook_app_id'] = {
					'name':  'fb:app_id',
					'content': settings.facebook.app_id
				};
			}

			if (settings.facebook.page_id) {
				meta.metaTags['Facebook_page_id'] = {
					'name': 'fb:page_id',
					'content': settings.facebook.page_id
				};
			}

			prefixes.push('fb: http://ogp.me/ns/fb#');
		}

		// twitter support
		if (settings.twitter) {
			if (settings.twitter.site) {
				meta.metaTags['Twitter_site'] = {
					'name': 'twitter:site',
					'content': '@' + settings.twitter.site
				};
			}

			if (settings.twitter.domain) {
				meta.metaTags['Twitter_domain'] = {
					'name': 'twitter:domain',
					'content': '@' + settings.twitter.domain
				};
			}

			if (settings.twitter.creator) {
				meta.metaTags['Twitter_creator'] = {
					'name': 'twitter:creator',
					'content': '@' + settings.twitter.creator
				};
			}
		}

		// google plus support
		if (settings.google && settings.google.plus) {
			if (settings.google.plus.publisher) {
				meta.linkTags['Google_GooglePlus_publisher'] = {
					'rel':  'publisher',
					'href': settings.google.plus.publisher
				};
			}
		}

		// link image
		if (images && images.length) {
			meta.linkTags.image_src = {
				'rel': 'image',
				'type': images[0].type || null,
				'src': images[0].src
			};
		}

		// prefixes
		if (prefixes.length) {
			meta.documentAttrs.prefix = prefixes.join(' ');
		}

		if (settings.debug) {
			console.log('bkjs.helpers.parserMeta():', meta);
		}

		callback(null, meta);
	},


	/**
	 * Parses the body for localization
	 *
	 * @param Object - locals
	 * @param String/Object - data
	 * @param Boolean - render
	 * @param Function - callback(err, result)
	 */
	parserBody: function(locals, data, render, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.parserBody(): Wrong \'locals\' argument object');
		}

		if (render !== null && typeof render !== 'boolean') {
			throw new Error('bkjs.helpers.parserBody(): Wrong \'render\' argument, expected type boolean');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.parserBody(): Wrong \'callback\' argument function');
		}

		if (typeof data === 'string') {
			data = _.get(locals, data);
		} else if (typeof data === 'object') {
			data = _.isEmpty(data) ? false : data;
		} else {
			throw new Error('bkjs.helpers.parserBody(): Wrong \'data\' argument, expected type string or object');
		}

		if (! data || typeof data !== 'object') {
			throw new Error('bkjs.helpers.parserBody(): Missing data object');
		}

		var self = this;
		var layout = settings.layout;
		var dataset = settings.dataset;

		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locale = locals.locale || null;
		var _isLocalized = data['lang_' + _locale] || false;
		var _render = (typeof render === 'boolean') ? render : true;

		// populate attributes
		if (_render) {
			data.attributes = {};
			data.attributes.class = [];
			data.attributes.class.push(layout.page_class);

			if (data.parent) {
				data.attributes.class.push(layout.page_child_class);
			} else {
				data.attributes.class.push(layout.page_content_class);
			}

			// customizer
			if (settings.customizer && data.custom) {
				if (data.custom.layout) {
					var layout_class = layout.page_customizer_layout_class_prefix + data.custom.layout;
					data.attributes.class.push(layout.page_customizer_layout_class);
					data.attributes.class.push(layout_class);

					if (settings.customizer.wider.indexOf(data.custom.layout)) {
						data.custom.wide = true;
					}
				} else {
					data.attributes.class.push(layout.page_template_class);
				}

				if (data.custom.background || data.custom.foreground) {
					var data = [], style = [];

					data.attributes.class.push(layout.page_customizer_styled_class);

					if (data.custom.background) {
						data[dataset.background] = data.custom.background;
						style.push('background: ' + data.custom.background + ';');
					}

					if (data.custom.foreground) {
						data[dataset.foreground] = data.custom.foreground;
						style.push('color: ' + data.custom.foreground + ';');
					}

					_.extend(data.attributes, data);
					data.attributes.style = style.join(' ');
				}

				if (! data.parent) {
					locals.custom = data.custom;
				}
			} else {
				data.attributes.class.push(layout.page_template_class);
			}
		}

		// i18n
		if (_i18n && _isLocalized && ! locals.default_locale) {
			//TODO auto-find translable fields extending field options (eg. localize: true)

			//-TEMP
			var list = locals.list;
			var tFields = settings.i18n.lists[list];
			//-TEMP

			// translate fields
			_.each(tFields, function(field) {
				var translated = self.translate(data, _locale, field);

				if (translated) {
					data.set(field, translated);
				} else {
					return;
				}
			});
		}

		// parse handlebars
		if (_render && settings.parse_handlebars && data.content) {
			if (! 'handlebars' in locals) {
				throw new Error('bkjs.helpers.parserBody(): Handlebars was not loaded');
			}

			if (! 'waiter' in locals) {
				throw new Error('bkjs.helpers.parserBody(): Waiter was not loaded');
			}

			//TODO auto-find parsable fields extending field options (eg. parsable: true)

			//-TEMP
			var parsable_fields = [];
			var pFields = (data).toObject().content;

			if (! pFields) {
				return callback(null, data);
			} else if (typeof pFields === 'object') {
				_.each(pFields, function(field, key) {
					parsable_fields.push('content.' + key);
				});
			} else if (typeof pFields === 'string') {
				parsable_fields.push('content');
			}
			//-TEMP

			// compile parsable fields
			async.each(parsable_fields, function(index, cb) {
				var field = data.get(index);

				// remove tinymce paragraphs
				field = field
					.replace(/<p>\{\{/g, '{{')
					.replace(/<br \/>\{\{/g, '{{')
					.replace(/\}\}<\/p>/g, '}}')
					.replace(/\}\}<br \/>/g, '}}');

				// sync compiling
				var _hbs = locals.handlebars.compile(field);

				// async failsafe compiling
				try {
					var compiled = _hbs(data);

					// wait for async helpers
					locals.waiter.done(function(values) {
						_.each(values, function(value, id) {
							compiled = compiled.replace(id, (value || ''));
						});

						data.set(index, compiled);

						return cb();
					});
				} catch(err) {
					cb(err);
				}
			}, function(err) {
				if (settings.debug) {
					console.log('bkjs.helpers.parserBody():', data);
				}

				return callback(err, data);
			});
		} else {
			if (settings.debug) {
				console.log('bkjs.helpers.parserBody():', data);
			}

			callback(null, data);
		}
	},


	/**
	 * Gets html attributes
	 *
	 * @param Object - locals
	 * @return Object - attributes
	 */
	getDocumentAttributes: function(locals) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.getDocumentAttributes(): Missing \'locals\' argument object');
		}

		var layout = locals.layout;
		var dataset = locals.dataset;

		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;

		var _attributes = _.extend({}, locals.meta.documentAttrs);

		if (_i18n) {
			var _locales = _.invert(settings.i18n.locales);
			var _locale = locals.locale || null;
			var _lang = _locales[_locale] ? _locales[_locale] : settings.i18n.default_locale;
			var _dir = settings.i18n.directions ? settings.i18n.directions[_locale] : null;

			_attributes.lang = _lang;
			_attributes.dir =_dir;
		} else if (settings.i18n.default_locale) {
			_attributes.lang = settings.i18n.default_locale;
		}

		return _attributes;
	},


	/**
	 * Gets body attributes
	 *
	 * @param Object - locals
	 * @return Object - attributes
	 */
	getBodyAttributes: function(locals) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.getBodyAttributes(): Missing \'locals\' argument object');
		}

		var layout = locals.layout;
		var dataset = locals.dataset;

		var _attributes = _.extend({}, locals.meta.bodyAttrs);

		if (locals.filters.page || locals.filters.index) {
			// homepage
			if (locals.filters.page == settings.homepage) {
				_attributes.class.push(layout.homepage_class);
			} else {
				// archive
				if (locals.filters.index) {
					_attributes.class.push(layout.archive_class);
				}
			}

			// page
			_attributes.class.push(layout.page_class);

			// hasChildren
			if (locals.data.hasChildren) {
				_attributes.class.push(layout.page_parent_class);
			}

			// template
			if (locals.template !== 'page') {
				_attributes.class.push(layout.page_template_class);

				if (locals.filters.index) {
					_attributes.class.push(layout.page_template_archive_class_prefix + locals.template);
				} else {
					_attributes.class.push(layout.page_template_class_prefix + locals.template);
				}
			}
		} else {
			// single
			_attributes.class.push(layout.single_class);

			if (locals.template) {
				_attributes.class.push(layout.single_template_class_prefix + locals.template);
			}
		}

		// has heading
		if (locals.data.hasHeading) {
			_attributes.class.push(layout.page_has_heading_class);
		}

		// customizer
		if (settings.customizer && locals.custom) {
			if (locals.custom.layout) {
				var layout_class = layout.page_customizer_layout_class_prefix + locals.custom.layout;
				_attributes.class.push(layout.page_customizer_layout_class);
				_attributes.class.push(layout_class);
			}
		}

		return _attributes;
	},


	/**
	 * Prepares data for share
	 *
	 * @param Object - locals
	 * @param Object - meta
	 * @param Function - callback(err, result)
	 */
	prepareShareData: function(locals, meta, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.prepareShareData(): Wrong \'locals\' argument object');
		}

		if (! 'data' in locals) {
			throw new Error('bkjs.helpers.prepareShareData(): Missing \'data\' property into \'locals\' object');
		}

		if (! meta && typeof meta !== 'object') {
			throw new Error('bkjs.helpers.prepareShareData(): Wrong \'meta\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.prepareShareData(): Wrong \'callback\' argument function');
		}

		var share = {};
		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locale = locals.locale || null;

		share.uri = locals.data.uri || '#';
		share.title = meta.title || '';

		// twitter creator
		var twitter_via = '';

		if (meta.twitter && meta.twitter.creator) {
			twitter_via = '&via=' + encodeURIComponent(meta.twitter.creator.replace('@', ''));
		}

		share.links = {
			'facebook': {
				front: true,
				name: 'Facebook',
				label: 'Like',
				icon: 'icon-facebook',
				link: 'https://facebook.com/sharer.php?' +
					'url=' + encodeURIComponent(share.uri + '?utm_campaign=share&utm_medium=doc share link&utm_source=facebook.com') +
					'&title=' + encodeURIComponent(share.title)
			},
			'googleplus': {
				front: true,
				name: 'Google Plus',
				label: '+1',
				icon: 'icon-googleplus',
				link: 'https://plus.google.com/share?' +
					'url=' + encodeURIComponent(share.uri + '?utm_campaign=share&utm_medium=doc share link&utm_source=plus.google.com')
			},
			'twitter': {
				front: true,
				name: 'Twitter',
				label: 'Tweet',
				icon: 'icon-twitter',
				link: 'https://twitter.com/share?' +
					'url=' + encodeURIComponent(share.uri + '?utm_campaign=share&utm_medium=doc share link&utm_source=twitter.com') +
					'&text=' + encodeURIComponent(share.title) + twitter_via
			},
			'pinterest': {
				front: false,
				name: 'Pinterest',
				label: 'Pin it',
				icon: 'icon-pinterest',
				link: 'http://pinterest.com/pin/create/button/?' +
					'url=' + encodeURIComponent(share.uri + '?utm_campaign=share&utm_medium=doc share link&utm_source=pinterest.com') +
					'&description=' + encodeURIComponent(share.title)
			},
			'linkedin': {
				front: false,
				name: 'LinkedIn',
				label: 'Share',
				icon: 'icon-linkedin',
				link: 'https://www.linkedin.com/cws/share?url=' + encodeURIComponent(share.uri + '?isFramed=true')
			},
			'send-email': {
				front: false,
				name: 'E-mail',
				label: 'Send via e-mail',
				icon: 'icon-send-email',
				link: 'mailto:?subject={SITE}&amp;body={SITE}%0D%0A%0D%0A{URL}'
			},
			'copy-link': {
				front: false,
				name: 'Copy',
				label: 'Copy link',
				icon: 'icon-copy-link',
				link: '#copy-link'
			}
		};

		// i18n
		if (_i18n) {
			share.links['facebook'].label = locals.t('shareIntentFacebookLabel', { defaultValue: share.links['facebook'].label });
			share.links['googleplus'].label = locals.t('shareIntentGooglePlusLabel', { defaultValue: share.links['googleplus'].label });
			share.links['twitter'].label = locals.t('shareIntentTwitterLabel', { defaultValue: share.links['twitter'].label });
			share.links['pinterest'].label = locals.t('shareIntentPinterestLabel', { defaultValue: share.links['pinterest'].label });
			share.links['linkedin'].label = locals.t('shareIntentLinkedInLabel', { defaultValue: share.links['linkedin'].label });
			share.links['send-email'].name = locals.t('shareIntentSendEmailLabel', { defaultValue: share.links['send-email'].name });
			share.links['send-email'].label = locals.t('shareIntentSendEmailLabel', { defaultValue: share.links['send-email'].label });
			share.links['send-email'].link = locals.t('shareIntentSendEmailLink', { defaultValue: share.links['send-email'].link });
			share.links['copy-link'].name = locals.t('shareIntentCopyLinkLabel', { defaultValue: share.links['copy-link'].name });
			share.links['copy-link'].label = locals.t('shareIntentCopyLinkLabel', { defaultValue: share.links['copy-link'].label });
		}

		callback(null, share);
	},


	/**
	 * Add language support to the list
	 * TODO remove fields - auto discover list
	 *
	 * @param Object - list
	 * @param Array - fields
	 */

	addLanguageSupport: function(list, fields) {
		if (! settings.i18n.enable || ! settings.i18n.languages || ! settings.i18n.default_locale) {
			throw new Error('bkjs.helpers.addLanguageSupport(): Wrong i18n configuration');
		}

		if (! list && typeof list !== 'object') {
			throw new Error('bkjs.helpers.addLanguageSupport(): Wrong \'list\' argument object');
		}

		if (! 'fields' in list) {
			throw new Error('bkjs.helpers.addLanguageSupport(): Missing \'fields\' property into \'list\' object');
		}

		if (! fields && typeof fields !== 'object' && ! fields.length) {
			throw new Error('bkjs.helpers.addLanguageSupport(): Wrong \'fields\' argument object');
		}

		// all languages except the default
		var languages = _.omit(settings.i18n.languages, settings.i18n.default_locale);

		// begin paths population
		var paths = {};

		// prepare paths for each language
		_.each(languages, function(language, l) {
			var lang = 'lang_' + l, depends = {};
	
			depends[lang] = true;

			paths[lang] = {
				'type': Types.Boolean,
				'label': language,
				index: true
			};
			paths[l] = {};

			_.each(fields, function(field) {
				if (! list.fields[field]) {
					return;
				}

				paths[l][field] = _.omit(list.fields[field].options, ['initial', 'required']);
				paths[l][field].label = paths[l][field].label + ' (' + language.toLowerCase() + ')';
				paths[l][field].dependsOn = depends;
			});
		});

		if (settings.debug) {
			console.log('bkjs.helpers.addLanguageSupport():', list.fields, paths);
		}

		return paths;
	},


	/**
	 * SEO support
	 *
	 * @return Object - paths
	 */
	addSeoSupport: function() {
		if (! settings.seo.enable) {
			throw new Error('bkjs.helpers.addSeoSupport(): Wrong SEO configuration');
		}

		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;

		// begin paths population
		var paths = {};

		// SEO
		paths['seo'] = {
			'type': Types.Boolean,
			'label': 'Manage SEO meta tags'
		}

		// Meta title
		paths['meta.title'] = {
			'type': Types.Text,
			'label': 'Meta Title',
			'note': 'Max 90 characters',
			'dependsOn': { 'seo': true }
		}

		// Meta description
		paths['meta.description'] = {
			'type': Types.Text,
			'label': 'Meta Description',
			'note': 'Max 110 characters',
			'dependsOn': { 'seo': true }
		}

		// Meta keywords
		if (settings.seo.keywords_support) {
			paths['meta.keywords'] = {
				'type': Types.TextArray,
				'label': 'Meta Keywords',
				'note': 'Comma separated values, max 200 characters',
				'dependsOn': { 'seo': true }
			}
		}

		// Meta url
		paths['meta.url'] = {
			'type': Types.Url,
			'noedit': true,
			'hidden': true
		}

		//TODO
		// implement custom image
		// implement custom url parameters

		// Opengraph support
		if (settings.seo.custom && settings.seo.custom.opengraph) {
			paths['meta.opengraph_custom'] = {
				'type': Types.Boolean,
				'label': 'OpenGraph customization',
				'dependsOn': { 'seo': true }
			}

			paths['meta.opengraph_title'] = {
				'type': Types.Text,
				'label': 'Title',
				'note': 'Max 90 characters',
				'dependsOn': { 'seo': true, 'meta.opengraph_custom': true }
			}

			paths['meta.opengraph_description'] = {
				'type': Types.Text,
				'label': 'Description',
				'note': 'Max 110 characters',
				'dependsOn': { 'seo': true, 'meta.opengraph_custom': true }
			}

			paths['meta.opengraph_author'] = {
				'type': Types.Url,
				'label': 'Author',
				'dependsOn': { 'seo': true, 'meta.opengraph_custom': true }
			}

			//TODO
			// implement other fields http://ogp.me/
		}

		// Twitter support
		if (settings.seo.custom && settings.seo.custom.twitter) {
			paths['meta.twitter_custom'] = {
				'type': Types.Boolean,
				'label': 'Twitter customization',
				'dependsOn': { 'seo': true }
			}

			paths['meta.twitter_card'] = {
				'type': Types.Select,
				'label': 'Card Type',
				'options': [
					{ 'value': 'image', 'label': 'Summary Card' },
					{ 'value': 'video', 'label': 'Summary Card with Large Image' }
				],
				'dependsOn': { 'seo': true, 'meta.twitter_custom': true }
			}

			paths['meta.twitter_title'] = {
				'type': Types.Text,
				'label': 'Title',
				'note': 'Max 90 characters',
				'dependsOn': { 'seo': true, 'meta.twitter_custom': true }
			}

			paths['meta.twitter_description'] = {
				'type': Types.Text,
				'label': 'Description',
				'note': 'Max 110 characters',
				'dependsOn': { 'seo': true, 'meta.twitter_custom': true }
			}

			paths['meta.twitter_creator'] = {
				'type': Types.Text,
				'label': 'Creator',
				'note': 'Insert a valid Twitter username',
				'dependsOn': { 'seo': true, 'meta.twitter_custom': true }
			}

			//TODO
			// https://dev.twitter.com/cards/overview
			// implement custom image
			// implement app and player cards
		}

		// Add localization support
		if (_i18n) {
			// get fields
			var fields = Object.keys(paths).splice(1);

			// all languages except the default
			var languages = _.omit(settings.i18n.languages, settings.i18n.default_locale);

			// prepare paths for each language
			_.each(languages, function(language, l) {
				var lang = 'lang_' + l, depends = {};

				depends.seo = true;
				depends[lang] = true;

				paths[l] = {};

				_.each(fields, function(field) {
					if (! paths[field]) {
						return;
					}

					paths[l][field] = _.extend({}, paths[field]);
					paths[l][field].label = paths[field].label + ' (' + language.toLowerCase() + ')';
					paths[l][field].dependsOn = depends;
				});
			});
		}

		if (settings.debug) {
			console.log('bkjs.helpers.addSeoSupport():', paths);
		}

		return paths;
	},


	/**
	 * Get localized text
	 *
	 * @param Object - result
	 * @param String - locale
	 * @param String - field
	 * @param Boolean - fallback
	 * @return Mixed - String/Boolean - translated
	 */
	translate: function(result, locale, field, fallback) {
		if (! result && typeof result !== 'object') {
			throw new Error('bkjs.helpers.translate(): Wrong \'result\' argument object');
		}

		if (! locale && typeof locale !== 'string') {
			throw new Error('bkjs.helpers.translate(): Wrong \'locale\' argument string');
		}

		if (! field && typeof field !== 'string') {
			throw new Error('bkjs.helpers.translate(): Wrong \'field\' argument string');
		}

		var translated = result.get(locale + '.' + field);

		if (translated) {
			return translated;
		}

		if (fallback) {
			translated = result.get(field[0]);

			if (translated) {
				return translated;
			}
		}

		return false;
	},


	/**
	 * A filter for e-mail with encryption
	 *
	 * @param String - email
	 * @param Boolean - html (false)
	 * @param Boolean - crypt (true)
	 * @param String - title
	 * @param String - class
	 * @return String - filtered
	 */
	filterEmail: function(email, html, crypt, title, text, classes) {
		if (! email && typeof email !== 'string') {
			throw new Error('bkjs.helpers.filterEmail(): Wrong \'email\' argument string');
		}

		email = email.toString().trim();
		html = html || false;
		crypt = crypt || true;

		var filtered = '';

		if (crypt)  {
			for (i=0; i < email.length; i++) {
				filtered += '&#' + email.charCodeAt(i) + ';';
			}
		}

		if (! html) {
			return filtered;
		}

		email = filtered;

		if (crypt) {
			var mailto = '';

			for (i=0; i < 'mailto:'.length; i++) {
				mailto += '&#' + 'mailto:'.charCodeAt(i) + ';';
			}
		}

		filtered  = '<a';
		filtered += ((! classes) ? '' : ' class="' + classes.trim() + '"');
		filtered += ' href="' + mailto + email + '"';
		filtered += ((! title) ? '' : ' title="' + title.trim() + '"');
		filtered += '>' + ((text) ? text.trim() : email);
		filtered += '</a>';

		return filtered;
	},


	/**
	 * Create navigations
	 *
	 * @param Object - locals
	 * @param Function - callback(err, menu)
	 */
	createNavigations: function(locals, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.createNavigations(): Wrong \'locals\' argument object');
		}

		if (! locals.navigations && typeof locals.navigations !== 'object') {
			throw new Error('bkjs.helpers.createNavigations(): Wrong \'navigations\' property into \'locals\' object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.createNavigations(): Wrong \'callback\' argument function');
		}

		var navs = Object.create(locals.navigations);

		var MenuItem = keystone.list('MenuItem');

		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locale = locals.locale;
		var _page_population = ['parent', 'slug'];

		// find all menu items
		var menu = MenuItem.model.find()
			.sort('sortOrder')
			.populate('item')
			.populate('menu', 'key position language')

		if (_i18n && ! locals.default_locale) {
			var _locales = settings.i18n.locales;

			_.each(_locales, function(_locale, locale) {
				_page_population.push(' lang_' + _locale);
				_page_population.push(_locale + '.slug');
			});
		}

		menu.populate('page', _page_population.join(' '));

		menu.exec(function(err, results) {
			if (settings.debug) {
				console.log('bkjs.helpers.createNavigations(): Query exec', err, results);
			}

			if (err || ! results.length) {
				return callback(err, null);
			}

			var items = {};

			_.each(results, function(item) {
				if (! item.menu) {
					return callback(true, null);
				}

				// i18n - skip different locales
				if (_i18n && item.menu.language !== _locale) {
					return;
				}

				items[item.key] = {
					'position': item.menu.position,
					'key': item.key,
					'label': item.label,
					'slug': item.page.slug || item.key,
					'url': item.href,
					'title': item.title
				};

				if (item.item) {
					items[item.key].parent = item.item.key;
				} else {
					items[item.key].children = [];
				}
			});

			_.each(items, function(item) {
				var _item = {}, _child = {};

				if (! navs[item.position]) {
					navs[item.position] = {};
				}

				if (item.parent) {
					_child = _.omit(item, ['position', 'parent']);
					//TODO
					_child.href = items[item.parent].url + item.slug + '/';

					if (! navs[item.position][item.parent]) {
						_item = _.omit(items[item.parent], 'position');
						navs[item.position][item.parent] = _item;
					}

					navs[item.position][item.parent].children.push(_child);
				} else {
					_item[item.key] = _.omit(item, 'position');
					_item[item.key].href = item.url;

					_.extend(navs[item.position], _item);
				}
			});

			if (settings.debug) {
				console.log('bkjs.helpers.createNavigations():', navs);
			}

			return callback(null, navs);
		});
	},


	/**
	 * Create language menu
	 *
	 * @param Object - locals
	 * @param Function - callback(err, language)
	 */
	createLanguageMenu: function(locals, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.createLanguageMenu(): Wrong \'locals\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.createLanguageMenu(): Wrong \'callback\' argument function');
		}

		var language = locals.language_selector || {};
		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locales = _.invert(settings.i18n.locales);
		var _locale = locals.locale;
		var _alternates = false;

		if (! locals.i18n || ! _i18n) {
			return callback(null, null);
		}

		if (locals.data && locals.data.alternate) {
			_alternate = locals.data.alternate;
		} else {
			return callback(null, null);
		}

		_.each(_alternate, function(lang, id) {
			var _lang = _locales[id];
			var lang_key = lang.title.toLowerCase();
			var lang_label = locals.t(lang_key + 'Label', { 'defaultValue': '' });
			var lang_title = locals.t(lang_key + 'Title', { 'defaultValue': '' });

			language[id] = {};
			language[id].class = ['lang', ('lang-' + _lang)];
			language[id].href = lang.href;
			language[id].label = lang_label || lang.title;
			language[id].title = lang_title || lang.title;
			language[id].flag = ['flag', ('flag-' + _lang)];

			if (_locale === id) {
				language[id].class.push('active');
			}
		});

		if (settings.debug) {
			console.log('bkjs.helpers.createLanguageMenu():', language);
		}

		return callback(null, language);
	},


	/**
	 * Get year-month by date
	 *
	 * @param Mixed - String/Object - date
	 * @return Object - date
	 */
	getYearMonth: function(date) {
		var y, m, _date;

		if (date && (typeof date == 'object' || typeof date == 'string')) {
			_date = new Date(date);
		} else {
			_date = new Date();
		}

		y = _date.getFullYear();

		m = _date.getMonth() + 1;
		m = (m < 10 ? '0' : '') + m;

		return { 'y': y.toString(), 'm': m.toString() };
	},


	/**
	 * Get upload path
	 *
	 * @param String - path
	 * @return String - path
	 */
	getUploadPath: function(path) {
		if (! path && typeof path !== 'string') {
			throw new Error('bkjs.helpers.getUploadPath(): Wrong\'path\' argument string');
		}

		// if upload-by-year-month is enabled add ym to the path
		if (settings.upload_do_ym) {
			var ym = this.getYearMonth();

			return path + ym.y + '/' + ym.m + '/';
		} else {
			return path;
		}
	},


	/**
	 * Get the upload private path
	 *
	 * @return String - path
	 */
	getUploadPrivatePath: function() {
		var _static = keystone.get('static');

		if (typeof _static === 'object') {
			_static = _static[1];
		}

		if (typeof _static !== 'string') {
			throw new Error('bkjs.helpers.getUploadPrivatePath(): Wrong static path configuration');
		}

		var path = _static + settings.upload_path;

		return this.getUploadPath(path);
	},


	/**
	 * Get the upload public path
	 *
	 * @return String - path
	 */
	getUploadPublicPath: function() {
		var path = settings.upload_path;

		return this.getUploadPath(path);
	},


	/**
	 * Formats image
	 *
	 * @param Function - item
	 * @param Object - file
	 * @return String - file
	 */
	getLocalFileFormat: function(item, file) {
		if (! item && typeof item !== 'function') {
			throw new Error('bkjs.helpers.getLocalFileFormat(): Wrong \'item\' argument function');
		}

		if (! file && typeof file !== 'object') {
			throw new Error('bkjs.helpers.getLocalFileFormat(): Wrong \'file\' argument object');
		}

		return this.getUploadPublicPath() + file.filename;
	},


	/**
	 * Filename image
	 * TODO rename
	 *
	 * @param Object - item
	 * @param Object - file
	 * @return String - filename
	 */
	getLocalFileFilename: function(item, file) {
		if (! item && typeof item !== 'object') {
			throw new Error('bkjs.helpers.getLocalFileFilename(): Wrong \'item\' argument function');
		}

		if (! file && typeof file !== 'object') {
			throw new Error('bkjs.helpers.getLocalFileFilename(): Wrong \'file\' argument object');
		}

		var _path = this.getUploadPrivatePath();
		var _date = new Date();
		var filename, exists, date;

		// rename
		if (settings.upload_do_rename) {
			filename = file.name;
		} else {
			filename = file.originalname;
		}

		// check if file exists
		exists = this.fileExists(_path + filename);

		// if file exist append ISO date
		if (exists) {
			_date = _date.toISOString();
			_date = _date.replace(/\D/g, '-').slice(0, -5);
			filename = filename.replace('.' + file.extension, '');
			filename = filename + '_' + _date + '.' + file.extension;
		}

		return filename;
	},


	/**
	 * Override Type LocalFile href method
	 *
	 * @param Function - item
	 * @return String - file
	 */
	getLocalFileHref: function(item) {
		if (! item && typeof item !== 'function') {
			throw new Error('bkjs.helpers.getLocalFileHref(): Wrong \'item\' argument function');
		}

		if (! item.get(this.paths.filename)) {
			return '';
		}

		var _static = keystone.get('static');

		if (typeof _static === 'object') {
			_static = _static[1];
		}

		if (typeof _static !== 'string') {
			throw new Error('bkjs.helpers.getLocalFileHref(): Wrong static path configuration');
		}

		var prefix = item.get(this.path).path;
		var filename = item.get(this.path).filename;

		prefix = prefix.replace(_static, '');

		return '/' + prefix + filename;
	},


	/**
	 * Get the media thumbnail in front-end
	 *
	 * @param Object - item
	 * @param Mixed - String/Array - size
	 * @return String - href
	 */
	getMediaThumbnail: function(item, size) {
		if (! settings.thumbnails || ! settings.thumbnails.enable) {
			throw new Error('bkjs.helpers.getMediaThumbnail(): Thumbnails disabled');
		}

		if (! settings.thumbnails.sizes) {
			throw new Error('bkjs.helpers.getMediaThumbnail(): Wrong thumbnails configuration');
		}

		if (! item && typeof item !== 'object') {
			throw new Error('bkjs.helpers.getMediaThumbnail(): Wrong \'item\' argument object');
		}

		if (! size && (typeof size !== 'object' || typeof size !== 'string')) {
			throw new Error('bkjs.helpers.getMediaThumbnail(): Wrong \'size\' argument');
		}

		var path = null;
		var filename = null;

		if (typeof size === 'object' && size[0] && size[1]) {
			var width = parseInt(size[0]);
			var height = parseInt(size[1]);

			//TODO settings.thumbnails.sizes || onthefly

		} else if (settings.thumbnails.sizes[size.toString()] !== undefined) {
			var _size = settings.thumbnails.sizes[size.toString()];
			var _static = keystone.get('static');

			if (typeof _static === 'object') {
				_static = _static[1];
			}

			if (typeof _static !== 'string') {
				throw new Error('bkjs.helpers.getMediaThumbnail(): Wrong static path configuration');
			}

			var _path = item.path;
			var _filename = item.filename;

			var width = _size.width;
			var height = _size.height;

			if (_path && _filename) {
				path = _path.replace(_static, '/');
				filename = _filename.substr(0, _filename.lastIndexOf('.'));
				filename += '-' + width + 'x' + height;
				filename += _filename.substr(_filename.lastIndexOf('.'));
			} else {
				return null;
			}
		} else {
			throw new Error('bkjs.helpers.getMediaThumbnail(): Bad request');
		}

		if (this.fileExists(_path + filename)) {
			return path + filename;
		} else {
			return item.get('href');
		}
	},


	/**
	 * Get the media thumbnail in AdminUI
	 *
	 * @param Object - item
	 * @return String - thumb
	 */
	getMediaAdminThumbnail: function(item) {
		if (! item && typeof item !== 'object') {
			throw new Error('bkjs.helpers.getMediaAdminThumbnail(): Wrong \'item\' argument object');
		}

		var thumb = '';

		if (item.type == 'image') {
			if (item.image.landscape && item.image.landscape.exists) {
				thumb = item.image.landscape.thumb('small');
			} else if (item.image.portrait && item.image.portrait.exists) {
				thumb = item.image.portrait.thumb('small');
			}
		} else if (item.type == 'video') {
			if (item.video.poster && item.video.poster.exists) {
				thumb = item.video.poster.thumb('small');
			} else {
				thumb = '/keystone/images/icons/32/_page.png';
			}
		} else if (item.type == 'audio') {
			thumb = '/keystone/images/icons/32/_page.png';
		} else if (item.type == 'embed') {
			if (item.embed.source && item.embed.source.exists) {
				thumb = item.embed.source.thumbnailUrl;
			} else {
				thumb = '/keystone/images/icons/32/_page.png';
			}
		} else {
			thumb = '/keystone/images/icons/32/_blank.png';
		}

		if (thumb) {


			//TODO remove temp
			//if (! /^(\/|http)/i.test(thumb)) {
			//	thumb = '/' + thumb;
			//}


			return '<a href="/keystone/media/' + item.id + '"><img class="thumb" src="' + thumb + '"></a>';
		} else {
			return '';
		}
	},


	/**
	 * Create media thumbnails
	 *
	 * @param Object - item
	 */
	createMediaThumbnails: function(item) {
		// TODO check lib

		if (! settings.thumbnails || ! settings.thumbnails.enable) {
			throw new Error('bkjs.helpers.createMediaThumbnails(): Thumbnails disabled');
		}

		if (! settings.thumbnails.sizes) {
			throw new Error('bkjs.helpers.createMediaThumbnails(): Wrong thumbnails configuration');
		}

		if (! item && typeof item !== 'object') {
			throw new Error('bkjs.helpers.createMediaThumbnails(): Wrong \'item\' argument object');
		}

		var self = this;

		// TODO implement video thumbnails
		if (item.type !== 'image') {
			return;
		}

		// create a thumbnail for each size
		_.each(settings.thumbnails.sizes, function(size) {
			if (item.image.landscape.size) {
				self.createImageThumbnail(item.image.landscape, size);
			}

			if (item.image.portrait.size) {
				self.createImageThumbnail(item.image.portrait, size);
			}
		});
	},


	/**
	 * Create media thumbnail
	 *
	 * @param Object - source
	 * @param Object - size
	 */
	createImageThumbnail: function(source, size) {
		if (! source && typeof source !== 'object') {
			throw new Error('bkjs.helpers.createImageThumbnail(): Wrong \'source\' argument object');
		}

		if (! size && typeof size !== 'object') {
			throw new Error('bkjs.helpers.createImageThumbnail(): Wrong \'size\' argument object');
		}

		//TODO check source properties (path, filename, )
		//TODO check size properties (width, height, crop)

		var _path = source.path + source.filename;
		var image = sharp(_path);

		if (! image) {
			throw new Error('bkjs.helpers.createImageThumbnail(): Cannot create image thumbnail');
		}

		var thumb = source.path;
		thumb += source.filename.substr(0, source.filename.lastIndexOf('.'));
		thumb += '-' + size.width + 'x' + size.height;
		thumb += source.filename.substr(source.filename.lastIndexOf('.'));

		var _width = parseInt(size.width);
		var _height = parseInt(size.height);
		var _crop = size.crop || false;
		var _quality = parseInt(size.quality) || parseInt(settings.thumbnails.quality);

		image.resize(_width, _height);

		if (! _crop) {
			image.max();
		} else if (_crop.length) {
			//TODO implement crop gravities
		}

		image.toFile(thumb, function(err) {
			if (settings.debug) {
				console.log(err, image, thumb);
			}
		});
	},


	/**
	 * Get media by guid
	 *
	 * @param Int - guid
	 * @param Function - callback(err, result) 
	 */
	getMedia: function(guid, callback) {
		if (! guid && typeof guid !== 'int') {
			throw new Error('bkjs.helpers.getMedia(): Wrong \'guid\' argument int');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getMedia(): Wrong \'callback\' argument function');
		}

		var media = null;
		var Media = keystone.list('Media');

		Media.model.findOne({
			'guid': parseInt(guid)
		}).exec(function(err, result) {
			if (settings.debug) {
				console.log('bkjs.helpers.getMedia(): Query exec', err, result);
			}

			if (err || ! result) {
				return callback(err, null);
			}

			var layout = settings.layout;
			var dataset = settings.dataset;

			var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
			var _locale = keystone.get('locale') || null;
			var _isLocalized = result['lang_' + _locale] || false;

			result.attributes = {};
			result.attributes.class = [layout.media_class];

			if (result.type === 'image') {
				result.attributes.class.push(layout.media_class_prefix + layout.image_class);
				result.image.attributes = {
					'class': [layout.image_class]
				};

				if (result.image.landscape.exists && result.image.portrait.exists) {
					result.image.attributes.class.push(layout.responsive_class);
					result.image.landscape.class = layout.landscape_class;
					result.image.portrait.class = layout.portrait_class;
				} else {
					result.image.attributes.class.push(layout.adaptive_class);
				}

				if (! result.showCaption) {
					result.image.caption = null;
				}
			} else if (result.type === 'video') {
				result.attributes.class.push(layout.media_class_prefix + layout.video_class);
				result.video.attributes = {
					'class': [layout.video_class],
					'controls': true
				};

				if (result.video.poster && result.video.poster.exists) {
					result.video.attributes.poster = result.video.poster.href;
				}
			} else if (result.type === 'audio') {
				result.attributes.class.push(layout.media_class_prefix + layout.audio_class);
				result.audio.attributes = {
					'class': [layout.audio_class],
					'controls': true
				};
			} else if (result.type === 'embed') {
				if (result.embed.source && result.embed.source.exists) {
					if (result.embed.source.type === 'photo') {
						result.type = 'image';
						result.attributes.class.push(layout.media_class_prefix + layout.image_class);
						result.attributes.class.push(layout.media_class_prefix + layout.embed_class);

						//TODO fix
						result.image = Object.create({});

						result.image = {
							'attributes': {
								'class': [layout.image_class, layout.adaptive_class]
							},
							'landscape': {
								'exists': true,
								'href': result.embed.source.url,
								'thumb': function() {
									if (result.embed.source.thumbnailUrl) {
										return result.embed.source.thumbnailUrl;
									}

									return result.embed.source.url;
								}
							}
						};

						if (result.embed.source.thumbnailUrl) {
							result.hasThumbnail = true;
						}

						if (result.showCaption) {
							var _caption = '';

							if (result.embed.source.title) {
								_caption += '<a class="caption-title" ';
								_caption += 'href="' + result.embed.source.url + '" ';
								_caption += 'target="_blank">' + result.embed.source.title + '</a>\n';
							}

							if (result.embed.source.authorName && result.embed.source.authorUrl) {
								_caption += '<a class="caption-author" ';
								_caption += 'href="' + result.embed.source.authorUrl + '" ';
								_caption += 'target="_blank">' + result.embed.source.authorName + '</a>\n';
							}

							if (result.embed.source.description) {
								_caption += '<p class="caption-description">';
								_caption += result.embed.source.description + '</p>\n';
							}

							result.image.caption = _caption;
						}
					} else if (result.embed.source.type === 'video') {
						result.type = 'embed';
						result.attributes.class.push(layout.media_class_prefix + layout.video_class);
						result.attributes.class.push(layout.media_class_prefix + layout.embed_class);

						var source = result.embed.source.html.match(/src\=["']([^"']*)["']/i);
						source = source[1].replace(/&/g, '&amp;');

						result.embed = {
							'attributes': {
								'class': [layout.embed_class, layout.video_class],
								'data-embedly-source': source,
								'data-embedly': ''
							},
							'html': '<noscript><iframe class="embedly-embed" src="' + source + '" scrolling="no" allowfullscreen></iframe></noscript>'
						};
					}
				} else if (result.embed.path) {
					result.attributes.class.push(layout.media_class_prefix + layout.embed_class);
					result.embed = {
						'attributes': {
							'class': [layout.embed_class]
						},
						'html': result.embed.path
					};
				}
			}

			if (result.alternate) {
				if (_i18n && _isLocalized && ! locals.default_locale) {
					result.alternate = helpers.translate(result, _locale, 'alternate', true);
				}
			} else {
				result.alternate = null;
			}

			media = result || null;

			callback(null, media);
		});
	},


	/**
	 * Gets a gallery by guid
	 *
	 * @param Int - guid
	 * @param Function - callback(err, result) 
	 */
	getGallery: function(guid, callback) {
		if (! guid && typeof guid !== 'int') {
			throw new Error('bkjs.helpers.getGallery(): Wrong \'guid\' argument int');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getGallery(): Wrong \'callback\' argument function');
		}

		var self = this;
		var gallery = null;

		var Gallery = keystone.list('Gallery').model;

		Gallery.findOne({
			'guid': parseInt(guid)
		})
		.populate('figures')
		.exec(function(err, result) {
			if (settings.debug) {
				console.log('bkjs.helpers.getGallery(): Query exec', err, result);
			}

			if (err || ! result) {
				return callback(err, null);
			}

			gallery = result || null;

			callback(null, gallery);
		});
	},


	/**
	 * Gets a slideshow by guid
	 *
	 * @param Int - guid
	 * @param Function - callback(err, result)
	 */
	getSlideshow: function(guid, callback) {
		if (! slug && typeof guid !== 'int') {
			throw new Error('bkjs.helpers.getSlideshow(): Wrong \'guid\' argument int');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getSlideshow(): Wrong \'callback\' argument function');
		}

		var self = this;
		var slideshow = null;

		var Slideshow = keystone.list('Slideshow').model;

		Slideshow.findOne({
			'guid': parseInt(guid)
		})
		.populate('slides')
		.exec(function(err, result) {
			if (settings.debug) {
				console.log('bkjs.helpers.getSlideshow(): Query exec', err, result);
			}

			if (err || ! result) {
				return callback(err, null);
			}

			slideshow = result || null;

			// get slides
			self.getSlideshowSlides(slideshow, function(slideshow) {
				slideshow = slideshow || null;
			});

			if (_.empty(_slideshow.slides)) {
				return callback(true, null);
			} else {
				// prepare slideshow data
				self.prepareSlideshowData(slideshow, function(err, slideshow) {
					slideshow = slideshow || null;

					if (err || ! slideshow) {
						return callback(err, null);
					}

					callback(null, slideshow);
				});
			}
		});
	},


	/**
	 * Fills the slideshow query with slides data
	 *
	 * @param Object - slideshow
	 * @param Function - callback(err, results)
	 */
	getSlideshowSlides: function(slideshow, callback) {
		if (! slideshow && typeof slideshow !== 'object') {
			throw new Error('bkjs.helpers.getSlideshowSlides(): Wrong \'slideshow\' argument object');
		}

		if (! 'slides' in slideshow) {
			throw new Error('bkjs.helpers.getSlideshowSlides(): Missing \'slides\' property into \'slideshow\' object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getSlideshowSlides(): Wrong \'callback\' argument function');
		}

		var self = this;

		var SlideshowSlide = keystone.list('SlideshowSlide');
		var Media = keystone.list('Media');

		SlideshowSlide.model.find({
			'_id': { $in: slideshow.slides }
		})
		//TODO check .sort('sortOrder')
		.populate('media')
		.exec(function(err, results) {
			if (settings.debug) {
				console.log('bkjs.helpers.getSlideshowSlides(): Query exec', err, results);
			}

			if (err || ! results.length) {
				return callback(err, null);
			}

			slideshow.slides = results;

			SlideshowSlide.model.populate(results, {
				'path': 'media',
				'model': Media.model
			}, function(err, results) {
				if (settings.debug) {
					console.log('bkjs.helpers.getSlideshowSlides(): Query populate', err, results);
				}

				if (err || ! results.length) {
					return callback(new Error('bkjs.helpers.getSlideshowSlides(): Query populate ' + err), results);
				}

				var layout = settings.layout;
				var dataset = settings.dataset;

				_.each(results, function(slide, i) {
					results[i].attributes = {};
					results[i].attributes.class = [layout.slide_class];

					if (slide.type === 'image') {
						results[i].attributes.class.push(layout.image_class);
						results[i].media.image.attributes = {
							'class': [layout.image_class]
						};

						if (i) {
							results[i].media.image.attributes.class.push(layout.slide_item_lazy_class);
						} else {
							results[i].media.image.attributes.class.push(layout.slide_item_class);
						}

						if (slide.media.image.landscape.exists && slide.media.image.portrait.exists) {
							results[i].media.image.attributes.class.push(layout.responsive_class);
							results[i].media.image.landscape.class = layout.landscape_class;
							results[i].media.image.portrait.class = layout.portrait_class;
						} else {
							results[i].media.image.attributes.class.push(layout.adaptive_class);
						}
					} else if (slide.type === 'video') {
						results[i].attributes.class.push(layout.video_class);
						results[i].media.video.attributes = {
							'class': [layout.video_class],
							'controls': true
						};

						if (slide.media.video.poster && slide.media.video.poster.exists) {
							results[i].media.video.attributes.poster = slide.media.video.poster.href;
						}
					} else if (slide.type === 'embed') {
						results[i].media.embed.attributes = {};

						if (slide.media.embed.source && slide.media.embed.source.exists) {
							if (slide.embed.source.type === 'photo') {
								results[i].type = 'image';
								results[i].attributes.class.push(layout.image_class);
								results[i].attributes.class.push(layout.embed_class);

								//TODO fix
								results[i].media.image = Object.create({});

								results[i].media.image = {
									'attributes': {
										'class': [layout.image_class, layout.adaptive_class]
									},
									'landscape': {
										'exists': true,
										'href': slide.embed.source.url
									}
								};
							} else if (slide.embed.source.type === 'video') {
								results[i].type = 'embed';
								results[i].attributes.class.push(layout.video_class);
								results[i].attributes.class.push(layout.embed_class);

								var source = slide.embed.source.html;
								//TODO fix char &
								//TODO strip width, height, allowfullscreen

								results[i].media.embed = {
									'attributes': {
										'class': [layout.embed_class, layout.video_class]
									},
									'html': source
								};
							}
						} else if (slide.embed.path) {
							results[i].attributes.class.push(layout.media_class_prefix + layout.embed_class);
							results[i].media.embed = {
								'attributes': {
									'class': [layout.embed_class]
								},
								'html': slide.media.embed.path
							};
						}
					} else if (slide.type === 'custom') {
						results[i].custom.attributes.class.push(layout.custom_class);
					}

					if (slide.hasCaption) {
						results[i].caption.attributes = {};
						results[i].caption.attributes.class = [layout.caption_class];
						results[i].caption.attributes.style = '';

						if (slide.caption.halign) {
							results[i].caption.attributes.class.push(layout.caption_halign_class_prefix + slide.caption.halign);
						} else {
							results[i].caption.attributes.class.push(layout.caption_halign_class_prefix + 'center');
						}

						if (slide.caption.valign) {
							results[i].caption.attributes.class.push(layout.caption_valign_class_prefix + slide.caption.valign);
						} else {
							results[i].caption.attributes.class.push(layout.caption_valign_class_prefix + 'bottom');
						}

						if (slide.caption.overlay) {
							results[i].caption.attributes.class.push(layout.caption_overlay_class);
						}

						if (slide.caption.background || slide.caption.color || slide.caption.shadow) {
							results[i].caption.attributes.class.push(layout.caption_custom_class);
						}

						if (slide.caption.backgroundColor) {
							var bgColor = slide.caption.backgroundColor;

							if (slide.caption.backgroundOpacity) {
								bgColor = self.hexToRgb(bgColor);

								if (typeof bgColor === 'object') {
									bgColor = 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',';
									bgColor += slide.caption.backgroundOpacity + ')';
								}
							}

							results[i].caption.attributes[dataset.background] = bgColor;
							results[i].caption.attributes.style += 'background:' + bgColor + ';';
						}

						if (slide.caption.foregroundColor) {
							results[i].caption.attributes[dataset.color] = slide.caption.foregroundColor;
							results[i].caption.attributes.style += 'color:' + slide.caption.foregroundColor + ';';
						}

						if (slide.caption.shadowColor) {
							var sdColor = slide.caption.shadowColor;
							var sdX = slide.caption.shadowX + 'px' || '1px';
							var sdY = slide.caption.shadowY + 'px' || '1px';

							if (slide.caption.shadowOpacity) {
								sdColor = self.hexToRgb(sdColor);

								if (typeof sdColor === 'object') {
									sdColor = 'rgba(' + sdColor.r + ',' + sdColor.g + ',' + sdColor.b + ',';
									sdColor += slide.caption.shadowOpacity + ')';
								}
							}

							results[i].caption.attributes[dataset.shadow] = sdX + ' ' + sdY + ' ' + sdColor;
							results[i].caption.attributes.style += 'text-shadow:' + sdX + ' ' + sdY + ' ' + sdColor + ';';
						}

						//TODO link
					}
				});

				_.extend(slideshow.slides, results);

				callback(null, slideshow);
			});
		});
	},


	/**
	 * Prepares slideshow data for rendering
	 *
	 * @param Object - slideshow
	 * @param Function - callback(err, result)
	 */
	prepareSlideshowData: function(slideshow, callback) {
		if (! slideshow && typeof slideshow !== 'object') {
			throw new Error('bkjs.helpers.prepareSlideshowData(): Wrong \'slideshow\' argument object');
		}

		if (! 'slides' in slideshow) {
			throw new Error('bkjs.helpers.prepareSlideshowData(): Missing \'slides\' property into \'slideshow\' object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.prepareSlideshowData(): Wrong \'callback\' argument function');
		}

		var self = this;
		var layout = settings.layout;
		var dataset = settings.dataset;

		slideshow.attributes = {};
		slideshow.attributes.class = [];
		slideshow.attributes.class.push(layout.slideshow_class);

		if (slideshow.slides.length == 1)
			slideshow.attributes.class.push(layout.slideshow_singular_class);

		slideshow.attributes.class.push(layout.slideshow_class_prefix + slideshow.guid);

		if (slideshow.fullscreen) {
			slideshow.attributes.class.push(layout.slideshow_fullscreen_class);
			slideshow.attributes[dataset.fullscreen] = '';
		}

		if (slideshow.options) {
			var options = JSON.stringify(slideshow.options);
			slideshow.attributes[dataset.options] = options;
		}

		async.each(slideshow.slides, function(slide, cb) {
			self.validateSlideData(slide, function(err, pass) {
				if (err) {
					return cb(err || true);
				}
				if (! pass) {
					var i = slideshow.slides.indexOf(slide);
					slideshow.slides.splice(i, 1);
				}

				cb();
			})
		}, function(err) {
			if (settings.debug) {
				console.log('bkjs.helpers.prepareSlideshowData():', slideshow);
			}

			callback(err, slideshow);
		});
	},


	/**
	 * Validate slide data
	 *
	 * @param Object - slide
	 * @param Function - callback(err, Boolean)
	 */
	validateSlideData: function(slide, callback) {
		if (! slide && typeof slide !== 'object') {
			throw new Error('bkjs.helpers.validateSlideData(): Wrong \'slide\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.validateSlideData(): Wrong \'callback\' argument function');
		}

		if (slide.type !== 'custom') {
			if (! 'media' in slide) {
				throw new Error('bkjs.helpers.validateSlideData(): Missing media attachment');
			}

			if (slide.type !== slide.media.type) {
				throw new Error('bkjs.helpers.validateSlideData(): Slide type must be the same of attached media type');
			}

			if (! slide.media[slide.media.type]) {
				throw new Error('bkjs.helpers.validateSlideData(): The current media is undefined');
			}
		}

		//TODO
		//image (valid if has landscape or portrait) and video (valid) or return false

		callback(null, true);
	},


	/**
	 * Gets heading from slideshow queried data
	 *
	 * @param Object - slideshow
	 * @param Function - callback(err, result)
	 */
	getHeading: function(slideshow, callback) {
		if (slideshow && typeof slideshow !== 'object') {
			throw new Error('bkjs.helpers.getHeading(): Wrong \'slideshow\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getHeading(): Wrong \'callback\' argument function');
		}

		if (_.isEmpty(slideshow)) {
			return callback(null, {});
		}

		var self = this;
		var _slideshow;

		async.waterfall([
			function(cb) {
				self.getSlideshowSlides(slideshow, function(err, result) {
					if (err || ! result) {
						return cb(err || true);
					}

					_slideshow = result || null;

					cb();
				})
			},
			function(cb) {
				self.prepareSlideshowData(slideshow, function(err, result) {
					if (err || ! result) {
						return cb(err || true);
					}

					_slideshow = result || null;

					cb();
				})
			}

		], function(err) {
			if (settings.debug) {
				console.log('bkjs.helpers.getHeading():', err, _slideshow);
			}

			callback(err, _slideshow);
		});
	},


	/**
	 * Gets cookies
	 *
	 * @param Object - locals
	 * @param Function - callback(err, result)
	 */
	getCookies: function(locals, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.getCookies(): Wrong \'locals\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getCookies(): Wrong \'callback\' argument function');
		}

		if (settings.legal.cookies && settings.legal.cookies.enable) {
			if (typeof settings.legal.cookies.href !== 'object') {
				return callback(null, null);
			}
		} else {
			return callback(null, null);
		}

		var Page = keystone.list('Page');

		var page = Page.model.findOne()
			.where('state', 'published')
			.where(settings.legal.cookies.href);

		page.exec(function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err || ! result) {
				locals.legal.cookies.href = '#';

				return callback(err, null);
			}

			if (result.url) {
				locals.legal.cookies.href = locals.absoluteBasePath + result.url;
			} else {
				locals.legal.cookies.href = '#';
			}

			callback(err, result);
		});
	},


	/**
	 * Gets inline scripts
	 *
	 * @param Object - locals
	 * @param Function - callback(err, result)
	 */
	getInlineScripts: function(locals, callback) {
		if (! locals && typeof locals !== 'object') {
			throw new Error('bkjs.helpers.getInlineScripts(): Wrong \'locals\' argument object');
		}

		if (! callback && typeof callback !== 'function') {
			throw new Error('bkjs.helpers.getInlineScripts(): Wrong \'callback\' argument function');
		}

		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;
		var _locale = locals.locale || null;

		async.series([
			function(cb) {
				if (locals.environment) {
					return cb(null, '_ENV="' + locals.environment + '"');
				} else {
					return cb(true, null);
				}
			},
			function(cb) {
				var params = {};

				if (settings.params && typeof settings.params === 'object') {
					params = _.merge({}, settings.params);
				}

				if (locals.legal) {
					_.assign(params, _.merge({}, locals.legal));
				}

				if (locals.disqus) {
					params.disqus = _.merge({}, locals.disqus);
				}

				if (! _.isEmpty(params)) {
					return cb(null, '_PARAMS=' + JSON.stringify(params).replace(/;*$/, ''));
				} else {
					return cb(true, null);
				}
			},
			function(cb) {
				var _ns = settings.i18n.options.ns || null;

				if (_i18n && i18next.hasResourceBundle(_locale, _ns)) {
					var bundle = i18next.getResourceBundle(_locale, _ns);

					if (typeof bundle === 'object') {
						return cb(null, '_L10N=' + JSON.stringify(bundle).replace(/;*$/, ''));
					} else {
						return cb(true, null);
					}
				}
			},
			function(cb) {
				if (settings.inline_config_file) {
					var path = settings.inline_config_file;

					fs.readFile(path, 'utf8', function(err, contents) {
						if (contents) {
							if (contents.indexOf('//#') != -1) {
								contents = contents.split('//#')[0];
							}

							return cb(null, contents.replace('var ', '').replace(/;*$/, ''));
						} else {
							return cb(err, null);
						}
					});
				}
			},
		], function(err, inline) {
			if (settings.debug) {
				console.log('bkjs.helpers.getInlineScripts():', err, inline);
			}

			if (! err && inline.length) {
				inline = 'var ' + _.compact(inline).join(',');

				return callback(null, inline);
			}

			callback(err, '');
		});
	}
};