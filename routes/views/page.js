var keystone = require('keystone');
var _ = require('lodash');
var async = require('async');
var helpers = require('../../lib/bkjs/helpers');
var settings = keystone.get('settings');


exports = module.exports = function(req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	var Page = keystone.list('Page');
	var ChildPage = keystone.list('ChildPage');


	// Set locals
	locals.template = 'page';
	locals.type = 'page';

	locals.filters = {
		'page': req.params.page,
		'child': req.params.child,
		'request': null
	};

	locals.data = {
		'page': {},
		'children': [],
		'share': {},
		'heading': {},
		'alternate': false,
		'hasChildren': false,
		'hasHeading': false
	};


	// If page is undefined go home
	if (locals.filters.page === undefined) {
		locals.filters.page = settings.homepage;
	}

	// Switch for child requests
	if (locals.filters.child === undefined) {
		locals.filters.request = locals.filters.page;
	} else {
		locals.filters.request = locals.filters.child;
	}


	// Load the current page
	view.on('init', function(next) {

		if (! locals.filters.page) {
			return res.notFound('pageNotFound');
		}

		var slug = 'slug';
		var pathname = req.originalUrl.split('/');

		if (! locals.default_locale) {
			slug = locals.locale + '.' + slug;
			locals.path = '/' + pathname[1] + '/' + pathname[3] + '/';
		} else {
			locals.path = '/' + pathname[1] + '/';
		}

		var page = Page.model.findOne()
			.where('state', 'published')
			.where(slug, locals.filters.request)
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
				return res.notFound('pageNotFoundTitle', 'pageNotFoundText');
			}

			if (result.parent && ! result.singular) {
				return res.notFound('pageNotFoundTitle', 'pageNotFoundText');
			}

			locals.list = 'Page';
			locals.template = result.template || locals.template;
			locals.section = result.slug;
			locals.data.id = result._id;
			locals.data.uri = locals.absoluteUrl;
			locals.data.page = result;
			locals.data.page.author = _.omit(result.author, 'password');

			next();
		});

	});


	// Load page childs
	view.on('init', function(next) {

		var childs = Page.model.find({
				'state': 'published',
				'parent': locals.data.id
			})
			.populate('author heading')
			.sort('sortOrder');

		if (! locals.default_locale) {
			childs.populate(locals.locale + '.heading');
		}

		childs.exec(function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			async.each(results, function(result, cb) {
				var i = results.indexOf(result);

				helpers.parserBody(locals, result, null, function(err, _result) {
					results[i] = _result;

					cb(err);
				});
			}, function(err) {
				if (settings.debug) {
					console.log(err, result);
				}

				if (results && results.length) {
					locals.data.hasChildren = true;
					locals.data.children = results;
				}

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
				helpers.parserMeta(locals, 'data.page', null, cb);
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