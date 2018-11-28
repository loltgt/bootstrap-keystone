module.exports = {

	email: function(context) {
		var _options = {
			'email': '',
			'class': '',
			'title': ''
		};

		var options = _.defaults(context.hash, _options);
		var email = options.email || context.fn(this);
		var result = '';

		result = helpers.filterEmail(email, true, true, options.title, false, options.classes);

		return result;
	},

	row: function(context) {
		var layout = locals.layout;

		return helpers.genericHandlebarsElement(locals, context, {
			'class': layout.row_class
		});
	},

	column: function(context) {
		var layout = locals.layout;
		var options = _.extend(context.hash, {});
		var classes = [];

		if (options.large) {
			classes.push(layout.column_class_prefix + layout.large_class_prefix + parseInt(options.large));
		}

		if (options.medium) {
			classes.push(layout.column_class_prefix + layout.medium_class_prefix + parseInt(options.medium));
		}

		if (options.small) {
			classes.push(layout.column_class_prefix + layout.small_class_prefix + parseInt(options.small));
		}

		if (options['offset-large']) {
			classes.push(layout.column_class_prefix + layout.large_class_prefix + layout.offset_class_suffix);
		}

		if (options['offset-medium']) {
			classes.push(layout.column_class_prefix + layout.medium_class_prefix + layout.offset_class_suffix);
		}

		if (options['offset-small']) {
			classes.push(layout.column_class_prefix + layout.small_class_prefix + layout.offset_class_suffix);
		}

		if (options['push-large']) {
			classes.push(layout.column_class_prefix + layout.large_class_prefix + layout.push_class_suffix);
		}

		if (options['push-medium']) {
			classes.push(layout.column_class_prefix + layout.medium_class_prefix + layout.push_class_suffix);
		}

		if (options['push-small']) {
			classes.push(layout.column_class_prefix + layout.small_class_prefix + layout.push_class_suffix);
		}

		if (options['center-large']) {
			classes.push(layout.column_class_prefix + layout.large_class_prefix + layout.center_class_suffix);
		}

		if (options['center-medium']) {
			classes.push(layout.column_class_prefix + layout.medium_class_prefix + layout.center_class_suffix);
		}

		if (options['center-small']) {
			classes.push(layout.column_class_prefix + layout.small_class_prefix + layout.center_class_suffix);
		}

		return helpers.genericHandlebarsElement(locals, context, {
			'class': classes
		});
	},

	panel: function(context) {
		return helpers.genericHandlebarsElement(locals, context, {
			'class': 'panel'
		});
	},

	panel_header: function(context) {
		return helpers.genericHandlebarsElement(locals, context, {
			'wrap': '<h5>.*</h5>',
			'class': 'panel-header'
		});
	},

	panel_content: function(context) {
		return helpers.genericHandlebarsElement(locals, context, {
			'class': 'panel-content'
		});
	},

	launcher: function(context, callback) {
		var options = context.hash || {};
		var url = '#';
		url = context.fn(this);
		url = handlebars.Utils.escapeExpression(url);

		if (! url) {
			return callback('');
		}

		var _i18n = (settings.i18n.enable && settings.i18n.default_locale) || false;

		var result = {
			'attributes': {
				'class': ['launcher']
			},
			'anchor': {
				'attributes': {}
			}
		};

		var classes = options.class ? handlebars.Utils.escapeExpression(options.class).split(' ') : null;
		var nofollow = options.nofollow === 'false' ? false : true;

		result.anchor.attributes.href = url;
		result.anchor.url = url.replace(new RegExp('https*:\/\/', 'ig'), '');

		if (_i18n) {
			result.anchor.text = locals.t('launcherText', { defaultValue: 'Go to the website:' });
		} else {
			result.anchor.text = 'Go to the website:';
		}

		if (options.text === false) {
			result.anchor.text = false;
			result.attributes.class.push('mono');
		} else if (options.text) {
			result.anchor.text = handlebars.Utils.escapeExpression(options.text);
		}

		if (options.icon) {
			result.anchor.icon = handlebars.Utils.escapeExpression(options.icon);
		} else {
			result.anchor.icon = 'icon-link';
		}

		if (options.title) {
			result.anchor.attributes.title = handlebars.Utils.escapeExpression(options.title);
		} else {
			result.anchor.attributes.title = result.anchor.text + ' ' + result.anchor.url;
		}

		if (nofollow) {
			result.anchor.attributes.rel = 'nofollow';
		}

		if (options.target) {
			result.anchor.attributes.target = handlebars.Utils.escapeExpression(options.target);
		}

		if (typeof classes === 'array') {
			result.attributes.class = _.union(result.attributes.class, classes);
		}

		// render jade
		var _launcher = jade.render('include ./templates/mixins/hbs-helpers\n+launcher(data)', {
			'filename': __dirname,
			'cache': false,
			'debug': settings.debug,
			'layout': locals.layout,
			'data': result,
			'_': _,
			't': locals.t,
			'utils': keystone.utils,
			'editable': keystone.content.editable,
			'user': locals.user
		});

		callback(_launcher || '');
	},

	embed: function(context, callback) {
		var options = context.hash || {};

		var _embed = '';
		var classes = 'embed-responsive';
		var object = context.fn(this);
		var tag = options.tag ? handlebars.Utils.escapeExpression(options.tag) : 'iframe';
		var src = options.src ? handlebars.Utils.escapeExpression(options.src) : false;
		var content = options.content ? options.content : '';
		var ratio = options.ratio ? handlebars.Utils.escapeExpression(options.ratio) : '16:9';
		var fullscreen = options.fullscreen ? ' allowfullscreen' : '';
		var data = options.data ? ' ' + options.data : '';

		if (! src || ! object) {
			return callback('');
		}

		classes += ' embed-responsive-' + ratio.replace(':', 'by');

		_embed += '<div class="' + classes + '"';

		if (object) {
			_embed += object.replace('src=', 'class="embed-responsive-item" src=');
		} else {
			_embed += '<' + tag + ' class="embed-responsive-item"';
			_embed += ' src="' + src + '"' + fullscreen + data;
			_embed += '>' + content + '</' + tag + '>';
		}

		_embed += '</div>';

		return callback(_embed || '');
	},

	media: function(context, callback) {
		var options = context.hash || {};
		var guid = options.id ? parseInt(options.id) : null;
		var size = options.size ? (handlebars.Utils.escapeExpression(options.size) || 'large') : null;

		if (! guid) {
			return callback('');
		}

		helpers.getMedia(guid, function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err || ! result) {
				return callback('');
			}

			var layout = locals.layout;
			var dataset = locals.dataset;

			var classes = options.class ? handlebars.Utils.escapeExpression(options.class).split(' ') : null;
			var size = options.size ? (handlebars.Utils.escapeExpression(options.size) || 'large') : null;
			var responsive = options.responsive ? true : null;
			var ratio = options.ratio ? handlebars.Utils.escapeExpression(options.ratio) : '16:9';
			var width = options.width ? parseInt(options.width) : null;
			var height = options.heigth ? parseInt(options.height) : null;
			var alt = options.alt ? handlebars.Utils.escapeExpression(options.alt) : null;
			var controls = options.controls === 'false' ? false : true;
			var preload = options.preload ? handlebars.Utils.escapeExpression(options.preload) : null;
			var autoplay = options.autoplay ? true : null;
			var loop = options.loop ? true : null;
			var fullscreen = options.fullscreen ? true : null;
			var muted = options.muted ? true : null;
			var caption = options.caption === 'false' ? false : true;
			var data = options.data ? options.data.replace('; ', ';').split(';') : '';

			if (result.type === 'image') {
				if (size) {
					if (result.image.landscape && result.image.landscape.exists && result.hasThumbnail) {
						result.image.landscape.href = result.image.landscape.thumb(size);
					}

					if (result.image.portrait && result.image.portrait.exists && result.hasThumbnail) {
						result.image.portrait.href = result.image.portrait.thumb(size);
					}
				}

				if (! caption) {
					result.image.caption = null;
				}

				if (responsive) {
					ratio = ratio.replace(':', 'by');
					result.attributes.class.push(layout.embed_responsive_class);
					result.attributes.class.push(layout.embed_responsive_class_prefix + ratio);
					result.image.attributes.class.push(layout.embed_responsive_content_class);
				}
			} else if (result.type === 'video') {
				var _attributes = {
					'width': width,
					'height': height,
					'controls': controls,
					'preload': preload,
					'autoplay': autoplay,
					'loop': loop,
					'fullscreen': fullscreen,
					'muted': muted
				};

				result.video.attributes = _.defaults(result.video.attributes, _attributes); 

				if (responsive !== false) {
					ratio = ratio.replace(':', 'by');
					result.attributes.class.push(layout.embed_responsive_class);
					result.attributes.class.push(layout.embed_responsive_class_prefix + ratio);
					result.video.attributes.class.push(layout.embed_responsive_content_class);
				}
			} else if (result.type === 'audio') {
				var _attributes = {
					'controls': controls,
					'preload': preload,
					'autoplay': autoplay,
					'loop': loop,
					'muted': muted
				};

				result.audio.attributes = _.defaults(result.audio.attributes, _attributes); 
			} else if (result.type === 'embed') {
				if (responsive !== false) {
					ratio = ratio.replace(':', 'by');
					result.attributes.class.push(layout.embed_responsive_class);
					result.attributes.class.push(layout.embed_responsive_class_prefix + ratio);
					result.embed.attributes.class.push(layout.embed_responsive_content_class);
				}
			}

			if (alt) {
				result.alternate = alt;
			}

			if (typeof classes === 'array') {
				result.attributes.class = _.union(result.attributes.class, classes);
			}

			if (typeof data === 'array') {
				result.attributes = _.extend(result.attributes, data);
			}

			// render jade
			var _media = jade.render('include ./templates/mixins/hbs-helpers\n+media(data)', {
				'filename': __dirname,
				'cache': false,
				'debug': settings.debug,
				'layout': locals.layout,
				'data': result,
				'_': _,
				't': locals.t,
				'utils': keystone.utils,
				'editable': keystone.content.editable,
				'user': locals.user
			});

			callback(_media || '');
		});
	},

	thumbnail: function(context, callback) {
		var obj = (typeof context.data.root === 'object') ? context.data.root : false;
		var options = context.hash || {};
		var guid = options.id ? parseInt(options.id) : null;

		async.waterfall([
			function(cb) {
				if (guid) {
					return cb(null, guid, null);
				} else if (obj) {
					if (obj.thumbnail && obj.thumbnail.length) {
						return cb(null, null, obj.thumbnail[0]);
					}
				}

				cb(true, null, null);
			},
			function(guid, id, cb) {
				if (! guid && ! id) {
					return cb(true, null);
				}

				var Media = keystone.list('Media');

				Media.model.findOne({
					$or: [
						{'_id': id},
						{'guid': guid}
					]
				})
				.exec(function(err, result) {
					if (settings.debug) {
						console.log(err, result);
					}

					cb(err, result);
				});
			}
		], function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err || ! result) {
				return callback('');
			}

			var layout = locals.layout;
			var dataset = locals.dataset;

			var _thumb = '';
			var _classes = options.class ? handlebars.Utils.escapeExpression(options.class).split(' ') : null;
			var classes = ['doc-thumbnail', layout.image_class];
			var size = handlebars.Utils.escapeExpression(options.size) || 'large';
			var thumb, alt;

			if (result.type === 'image') {
				if (result.image.landscape && result.image.landscape.exists) {
					thumb = result.image.landscape || null;
				} else if (result.image.portrait && result.image.portrait.exists) {
					thumb = result.image.portrait || null;
				}
			} else if (result.type === 'video') {
				if (result.video.poster && result.video.poster.exists) {
					thumb = result.video.poster || null;
				}
			} else if (result.type === 'embed') {
				if (result.embed.source && result.embed.source.exists) {
					thumb = result.embed.source.thumbnailUrl || null;
				}
			}

			if (! thumb) {
				return callback('');
			}

			if (typeof _classes === 'array') {
				classes = _.union(classes, _classes);
			}

			if (result.hasThumbnail) {
				thumb = thumb.thumb(size);
			} else {
				thumb = thumb.href;
			}

			if (result.alternate) {
				alt = result.alternate;
			}

			if (thumb) {
				_thumb += '<figure class="' + classes.join(' ') + '">';
				_thumb += '<img src="' + thumb + '"';
				_thumb += alt ? ' alt="' + alt + '"' : '';
				_thumb += '></figure>';
			}

			callback(_thumb || '');
		});
	},

	cards: function(context, callback) {
		var options = context.hash || {};

		if (options.list && typeof options.list === 'string') {
			options.list = handlebars.Utils.escapeExpression(options.list);
		} else {
			return callback('');
		}

		var list = keystone.list(options.list);
		var pops = ['author', 'thumbnail', 'en_US.thumbnail'];
		var cols = parseInt(options.columns) || 4;
		var controller = handlebars.Utils.escapeExpression(options.controller) ? true : false;
		var filters = handlebars.Utils.escapeExpression(options.filters) || {};
		var omits = handlebars.Utils.escapeExpression(options.omits) || false;

		if (list) {
			var _list = locals.list;

			locals.list = options.list;

			options.cats = handlebars.Utils.escapeExpression(options.cats) || 'categories';
			options.hideMeta = handlebars.Utils.escapeExpression(options.hideMeta) || false;
		} else {
			return callback('');
		}

		if (options.populate) {
			options.populate = options.populate.split(' ');
			pops = _.union(pops, options.populate);
		}

		var cards = list.model.find()
			.where('state', 'published')
			.sort('-publishedDate')
			.limit(cols)
			.populate(pops);

		if (filters && typeof filters === 'object') {
			if (filters.category && filters.values && typeof filters.value === 'object') {
				cards.where(filters.category).in(filters);
			}
		}

		if (omits && omits.length) {
			omits = omits.split(' ');
		}

		cards.exec(function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			if (err || ! results) {
				if (_list) {
					locals.list = _list;
				}

				return callback('');
			}

			async.forEachOf(results, function(result, i, cb) {
				if (omits) {
					results[i] = _.omit(result, omits);
				}

				helpers.parserBody(locals, result, false, function(err, _result) {
					results[i] = _result;

					console.log(locals.list);

					cb(err);
				});
			}, function(err) {
				if (settings.debug) {
					console.log(err, results);
				}

				results.options = options;

				// render jade
				var _cards = jade.render('include ./templates/mixins/cards\n+cards(data)', {
					'filename': __dirname,
					'cache': false,
					'debug': settings.debug,
					'layout': locals.layout,
					'columns': cols,
					'data': results,
					'_': _,
					't': locals.t,
					'utils': keystone.utils,
					'editable': keystone.content.editable,
					'user': locals.user
				});

				if (_list) {
					locals.list = _list;
				}

				callback(_cards || '');
			});
		});
	},

	gallery: function(context, callback) {
		var options = context.hash || {};
		var guid = options.id ? parseInt(options.id) : null;

		if (! guid) {
			return callback('');
		}

		helpers.getGallery(guid, function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err || ! result) {
				return callback('');
			}

			var layout = locals.layout;
			var dataset = locals.dataset;

			var attributes = {
				'class': []
			};

			var cols = parseInt(options.columns) || 3;
			var slider = options.slider === 'true' ? true : false;
			var link = options.link === 'false' ? false : true;
			var size = handlebars.Utils.escapeExpression(options.size) || 'medium_cropped';
			var caption = options.caption === 'true' ? true : false;

			attributes.class.push(layout.gallery_class);
			attributes.class.push(layout.gallery_class_prefix + guid);
			attributes.class.push(layout.gallery_column_class_prefix + cols);

			if (typeof options.columns_small === 'number') {
				attributes.class.push(layout.gallery_column_class_prefix + parseInt(options.columns_small));
			}

			if (typeof options.columns_medium === 'number') {
				attributes.class.push(layout.gallery_column_class_prefix + parseInt(options.columns_medium));
			}

			if (typeof options.columns_large === 'number') {
				attributes.class.push(layout.gallery_column_class_prefix + parseInt(options.columns_large));
			}

			if (slider) {
				attributes.class.push(layout.slider_class);
			}

			if (options.options) {
				//TODO review
				attributes[dataset.options] = options;
			}

			result.attributes = attributes;

			// render jade
			var _gallery = jade.render('include ./templates/mixins/gallery\n+gallery(data)', {
				'filename': __dirname,
				'cache': false,
				'debug': settings.debug,
				'layout': layout,
				'dataset': dataset,
				'id': guid,
				'columns': cols,
				'link': link,
				'slider': slider,
				'size': size,
				'caption': caption,
				'data': result,
				'editable': keystone.content.editable,
				'user': locals.user
			});

			callback(_gallery || '');
		});
	}

};