var keystone = require('keystone');
var _ = require('lodash');
var async = require('async');
var helpers = require('../../lib/bkjs/helpers');
var settings = keystone.get('settings');


exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res);
	var locals = res.locals;

	var Portfolio = keystone.list('Portfolio');


	// Set locals
	locals.template = 'project';
	locals.section = 'portfolio';
	locals.type = 'article',

	locals.filters = {
		'project': req.params.project
	};

	locals.data = {
		'project': {},
		'share': {},
		'types': [],
		'alternate': false,
		'adjacents': { previous: null, next: null }
	};
	

	// Load the current project
	view.on('init', function(next) {

		if (! locals.filters.project) {
			return res.notFound('projectNotFoundTitle', 'projectNotFoundText');
		}

		var slug = 'slug';
		var pathname = req.originalUrl.split('/');

		if (! locals.default_locale) {
			slug = locals.locale + '.' + slug;
			locals.path = '/' + pathname[1] + '/' + pathname[2] + '/';
		} else {
			locals.path = '/' + pathname[1] + '/';
		}

		var project = Portfolio.model.findOne()
			.where('state', 'published')
			.where(slug, locals.filters.project)
			.populate('author types thumbnail');

		if (! locals.default_locale) {
			project.populate(locals.locale + '.thumbnail');
		}

		project.exec(function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err) {
				return res.err(err);
			}

			if (! result) {
				return res.notFound('projectNotFoundTitle', 'projectNotFoundText');
			}

			locals.list = 'Blog';
			locals.data.id = result.id;
			locals.data.uri = locals.absoluteUrl;
			locals.data.project = result;
			locals.data.author = _.omit(result.author, 'password');

			next(err);
		});

	});


	// Load adjacents projects
	view.on('init', function(next) {

		if (! locals.data.id) {
			return next();
		}

		var _date = locals.data.project.publishedDate;

		async.parallel({
			previous: function(cb) {
				Portfolio.model.findOne({
					'_id': { $ne: locals.data.id },
					'state': 'published',
					'publishedDate': { $gt: _date }
				})
				.sort('publishedDate')
				.exec(cb);
			},
			next: function(cb) {
				Portfolio.model.findOne({
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

			locals.data.adjacents = _.defaults(results, { previous: null, next: null });

			next(err);
		});
	});


	// Finalize
	view.on('init', function(next) {

		async.auto({
			alternate: function(cb) {
				locals.list = 'Portfolio';

				helpers.getAlternate(locals, 'data.project', true, cb);
			},
			body: function(cb) {
				helpers.parserBody(locals, 'data.project', null, cb);
			},
			meta: ['alternate', function(cb, results) {
				locals.data.alternate = results.alternate;

				helpers.parserMeta(locals, 'data.project', null, cb);
			}],
			share: ['meta', function(cb, results) {
				helpers.prepareShareData(locals, results.meta, cb);
			}],
			types: ['body', function(cb, results) {
				var types = [];

				locals.list = 'PortfolioType';

				async.eachOf(results.body.types, function(value, key, callback) {
					helpers.parserBody(locals, value, false, function(err, result) {
						types.push(result);

						callback(err);
					});
				}, function(err) {
					locals.list = 'Portfolio';

					cb(err, types);
				});
			}]
		}, function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.meta = results.meta;
			locals.data.project = results.body;
			locals.data.share = results.share;
			locals.data.types = results.types;
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
