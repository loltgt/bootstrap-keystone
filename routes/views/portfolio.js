var keystone = require('keystone');
var _ = require('lodash');
var async = require('async');
var helpers = require('../../lib/bkjs/helpers');
var settings = keystone.get('settings');


exports = module.exports = function(req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	var Page = keystone.list('Page');
	var Portfolio = keystone.list('Portfolio');
	var PortfolioType = keystone.list('PortfolioType');


	// Set locals
	locals.template = 'portfolio';
	locals.type = 'page';

	locals.filters = {
		'index': req.url.split('/')[1],
		'type': ('type' in req.params) ? req.params.type : null
	};

	locals.data = {
		'projects': [],
		'types': [],
		'type': null,
		'page': {},
		'share': {},
		'alternate': false,
		'hasHeading': false,
		'masonryAttrs': {},
		'options': {
			'list': 'Portfolio',
			'cats': 'types',
			'hideMeta': true
		}
	};


	// Load page
	view.on('init', function(next) {

		if (! locals.filters.index) {
			return res.notFound('Page not found');
		}

		var slug = 'slug';
		var pathname = req.originalUrl.split('/');

		if (! locals.default_locale) {
			slug = locals.locale + '.' + slug;
			locals.path = '/' + pathname[1] + '/' + pathname[2] + '/';
		} else {
			locals.path = '/' + pathname[1] + '/';
		}

		var page = Page.model.findOne()
			.where('state', 'published')
			.where(slug, locals.filters.index)
			.populate('author heading');

		if (! locals.default_locale) {
			page.populate(locals.locale + '.heading');
		}

		page.exec(function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err) {
				return res.err(err);
			}

			if (! result) {
				return res.notFound('pageNotFound');
			}

			locals.list = 'Page';
			locals.template = result.template || locals.template;
			locals.section = result.slug;
			locals.data.id = result._id;
			locals.data.uri = locals.absoluteUrl;
			locals.data.page = result;
			locals.data.page.author = _.omit(result.author, 'password');

			next(err);

		});

	});


	// Load all project types
	view.on('init', function(next) {

		PortfolioType.model
		.find()
		.sort('sortOrder')
		.exec(function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.list = 'PortfolioType';
			locals.data.types = [];

			async.each(results, function(result, cb) {
				var i = results.indexOf(result);
				var _key = results[i].key;

				helpers.parserBody(locals, result, false, function(err, _result) {
					results[i] = _.extend({}, _result);

					if (locals.default_locale) {
						results[i].key = [ _result.key ];
					} else {
						results[i].key = [ _result.key, _key ];
					}

					Portfolio.model
					.count()
					.where('types')
					.in([result.id])
					.exec(function(err, count) {
						result.postCount = count;
						cb(err);
					});
				});
			}, function(err) {
				locals.data.types = results;
				next(err);
			});

		});

	});


	// Load the current project type filter
	view.on('init', function(next) {

		if (locals.filters.type !== null) {
			if (! locals.filters.type) {
				return res.notFound('pageNotFoundTitle', 'portfolioInvalidTypeText');
			}

			PortfolioType.model.findOne({
				'key': locals.filters.type
			})
			.exec(function(err, result) {
				if (settings.debug) {
					console.log(err, result);
				}

				if (err || ! result) {
					locals.filters.type = null;
					return res.notFound('pageNotFoundTitle', 'portfolioInvalidTypeText');
				}

				locals.data.type = result;
				locals.data.masonryAttrs = {
					'data-isotope-options': 'filter: [data-filters*=\'' + locals.filters.type + '\']'
				};

				return next(err);
			});
		}

		if (! locals.filters.type) {
			next();
		}

	});


	// Load the posts
	view.on('init', function(next) {

		var projects = Portfolio.paginate({
				'page': req.query.page || 1,
				'perPage': 10,
				'maxPages': 10
			})
			.where('state', 'published')
			.sort('-publishedDate')
			.populate('author types thumbnail');

		if (! locals.default_locale) {
			projects.populate(locals.locale + '.thumbnail');
		}

		/*if (locals.data.type) {
			projects.where('types').in([locals.data.type]);
		}*/

		projects.exec(function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.list = 'Portfolio';

			async.forEachOf(results.results, function(result, i, cb) {
				helpers.parserBody(locals, result, false, function(err, _result) {
					results.results[i] = _result;
					results.results[i].author = _.omit(_result.author, 'password');

					cb(err);
				});
			}, function(err) {
				if (settings.debug) {
					console.log(err, results);
				}

				locals.data.projects = results;

				next(err);
			});
		});

	});


	// Finalize
	view.on('init', function(next) {

		async.auto({
			alternate: function(cb) {
				locals.list = 'Page';
				helpers.getAlternate(locals, 'data.page', true, cb);
			},
			body: function(cb) {
				helpers.parserBody(locals, 'data.page', null, cb);
			},
			meta: ['alternate', function(cb, results) {
				locals.data.alternate = results.alternate;
				helpers.parserMeta(locals, 'data.page', 'data.projects', cb);
			}],
			share: ['meta', function(cb, results) {
				helpers.prepareShareData(locals, results.meta, cb);
			}],
			heading: ['body', function(cb, results) {
				helpers.getHeading(results.body.heading, cb);
			}]
		}, function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.meta = results.meta;
			locals.data.page = results.body;
			locals.data.share = results.share;
			locals.data.heading = results.heading;
			locals.data.hasHeading = _.isEmpty(results.heading) ? false : true;

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
