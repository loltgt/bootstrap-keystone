var keystone = require('keystone');
var _ = require('lodash');
var async = require('async');
var helpers = require('../../lib/bkjs/helpers');
var utils = require('keystone-utils');
var settings = keystone.get('settings');


exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res);
	var locals = res.locals;

	var Blog = keystone.list('Blog');


	// Set locals
	locals.template = 'post';
	locals.section = 'blog';
	locals.type = 'article';

	locals.filters = {
		'year': req.params.year,
		'month': req.params.month,
		'post': req.params.post
	};

	locals.data = {
		'post': {},
		'share': {},
		'alternate': false,
		'adjacents': { previous: null, next: null },
		'tags': []
	};
	

	// Load the current post
	view.on('init', function(next) {

		if (
			(! locals.filters.year || locals.filters.year.length !== 4) ||
			(! locals.filters.month || locals.filters.month.length !== 2) ||
			! locals.filters.post
		) {
			return res.notFound('postNotFoundTitle', 'postNotFoundText');
		}

		var slug = 'slug';
		var pathname = req.originalUrl.split('/');

		if (! locals.default_locale) {
			slug = locals.locale + '.' + slug;
			locals.path = '/' + pathname[1] + '/' + pathname[2] + '/';
		} else {
			locals.path = '/' + pathname[1] + '/';
		}

		var post = Blog.model.findOne()
			.where('state', 'published')
			.where(slug, locals.filters.post)
			.populate('author categories thumbnail');

		if (! locals.default_locale) {
			post.populate(locals.locale + '.thumbnail');
		}

		post.exec(function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err) {
				return res.err(err);
			}

			if (! result) {
				return res.notFound('postNotFoundTitle', 'postNotFoundText');
			}

			// check date
			var _ym = helpers.getYearMonth(result.publishedDate);

			if (_ym.y !== locals.filters.year || _ym.m !== locals.filters.month) {
				return next(404);
			}

			locals.list = 'Blog';
			locals.data.id = result.id;
			locals.data.uri = locals.absoluteUrl;
			locals.data.post = result;
			locals.data.post.author = _.omit(result.author, 'password');

			next(err);

		});
		
	});


	// Load adjacents posts
	view.on('init', function(next) {

		var _date = locals.data.post.publishedDate;

		async.parallel({
			previous: function(cb) {
				Blog.model.findOne({
					'_id': { $ne: locals.data.id },
					'state': 'published',
					'publishedDate': { $gt: _date }
				})
				.sort('publishedDate')
				.exec(cb);
			},
			next: function(cb) {
				Blog.model.findOne({
					'_id': { $ne: locals.data.id },
					'state': 'published',
					'publishedDate': { $lt: _date }
				})
				.sort('-publishedDate')
				.exec(cb);
			}
		}, function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.data.adjacents = _.defaults(results, locals.data.adjacents);

			next(err);
		});

	});


	// Finalize
	view.on('init', function(next) {

		async.auto({
			alternate: function(cb) {
				locals.list = 'Blog';

				helpers.getAlternate(locals, 'data.post', true, cb);
			},
			body: function(cb) {
				helpers.parserBody(locals, 'data.post', null, cb);
			},
			meta: ['alternate', function(cb, results) {
				locals.data.alternate = results.alternate;

				helpers.parserMeta(locals, 'data.post', null, cb);
			}],
			share: ['meta', function(cb, results) {
				helpers.prepareShareData(locals, results.meta, cb);
			}],
			categories: ['body', function(cb, results) {
				var categories = [];

				locals.list = 'BlogCategory';

				async.eachOf(results.body.categories, function(value, key, callback) {
					helpers.parserBody(locals, value, false, function(err, result) {
						categories.push(result);

						callback(err);
					});
				}, function(err) {
					locals.list = 'Blog';

					cb(err, categories);
				});
			}],
			tags: ['body', function(cb, results) {
				if (! results.body.tags.length) {
					return cb(null, []);
				}

				var tags = [];

				locals.data.post.tags.forEach(function(tag) {
					var slug = utils.slug(tag).replace('_', '-');
					var href = locals.path + 'tag:' + slug + '/';
					var title = tag;

					if (locals.i18n) {
						title = locals.t('tagItemTitle', { postProcess: 'sprintf', sprintf: [ tag ], defaultValue: title });
					}

					tags.push({
						'key': slug,
						'href': href,
						'label': tag,
						'title': title
					});
				});

				return cb(null, tags);
			}]
		}, function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.meta = results.meta;
			locals.data.post = results.body;
			locals.data.share = results.share;
			locals.data.categories = results.categories;
			locals.data.tags = results.tags;

			next(err);
		});

	});


	// Render the view
	view.render(function(err, req, res) {

		// Fill attributes
		res.locals.meta.documentAttrs = helpers.getDocumentAttributes(res.locals);
		res.locals.meta.bodyAttrs = helpers.getBodyAttributes(res.locals);

		// Render
		res.render(res.locals.template, res.locals);
	});
	
};
