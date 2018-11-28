var keystone = require('keystone');
var _ = require('lodash');
var async = require('async');
var helpers = require('../../lib/bkjs/helpers');
var utils = require('keystone-utils');
var settings = keystone.get('settings');


exports = module.exports = function(req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	var Page = keystone.list('Page');
	var Blog = keystone.list('Blog');
	var BlogCategory = keystone.list('BlogCategory');


	// Set locals
	locals.template = 'blog';
	locals.type = 'page';

	locals.filters = {
		'index': req.url.split('/')[1],
		'category': ('category' in req.params) ? req.params.category : null,
		'tag': ('tag' in req.params) ? req.params.tag : null
	};

	locals.data = {
		'posts': [],
		'categories': [],
		'category': null,
		'tag': null,
		'page': {},
		'share': {},
		'alternate': false,
		'hasHeading': false,
		'masonryAttrs': {},
		'options': {
			'list': 'Blog',
			'cats': 'categories'
		}
	};


	// Load page
	view.on('init', function(next) {

		if (! locals.filters.index) {
			return res.notFound('pageNotFoundTitle', 'pageNotFoundText');
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
			.where('slug', locals.filters.index)
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


	// Load all categories
	view.on('init', function(next) {

		BlogCategory.model
		.find()
		.sort('sortOrder')
		.exec(function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.list = 'BlogCategory';
			locals.data.categories = [];

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

					Blog.model
					.count()
					.where('categories')
					.in([result.id])
					.exec(function(err, count) {
						result.postCount = count;
						cb(err);
					});
				});
			}, function(err) {
				locals.data.categories = results;

				next(err);
			});

		});

	});


	// Load the current category filter
	view.on('init', function(next) {

		if (locals.filters.category !== null) {
			if (! locals.filters.category) {
				switch (locals.template) {
					case 'cards':
						return res.notFound('pageNotFoundTitle', 'cardsInvalidCategoryText');
					break;

					default:
						return res.notFound('pageNotFoundTitle', 'blogInvalidCategoryText');
					break;
				}
			}

			BlogCategory.model.findOne({
				'key': locals.filters.category
			})
			.exec(function(err, result) {
				if (settings.debug) {
					console.log(err, result);
				}

				if (err || ! result) {
					locals.filters.category = null;

					switch (locals.template) {
						case 'cards':
							return res.notFound('pageNotFoundTitle', 'cardsInvalidCategoryText');
						break;

						default:
							return res.notFound('pageNotFoundTitle', 'blogInvalidCategoryText');
						break;
					}
				}

				locals.data.category = result;
				locals.data.masonryAttrs = {
					'data-isotope-options': 'filter: [data-filters*=\'' + locals.filters.category + '\']'
				};

				return next(err);
			});
		}

		if (locals.filters.tag !== null) {
			if (locals.filters.tag !== undefined && locals.filters.tag.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) && locals.filters.tag.length <= 64) {
				var posts = Blog.model.find({
						'tags': {
							$in: [ new RegExp(locals.filters.tag.replace('-', ' '), 'i') ]
						}
					})
					.where('state', 'published');

				posts.exec(function(err, result) {
					if (settings.debug) {
						console.log(err, result);
					}

					if (err || ! result) {
						locals.filters.tag = null;

						switch (locals.template) {
							case 'cards':
								return res.notFound('pageNotFoundTitle', 'cardsInvalidTagText');
							break;

							default:
								return res.notFound('pageNotFoundTitle', 'blogInvalidTagText');
							break;
						}
					}

					locals.data.tag = locals.filters.tag.replace('-', ' ');
					locals.data.masonryAttrs = {
						'data-isotope-options': 'filter: [data-tags*=\'' + locals.filters.tag + '\']'
					};

					return next(err);
				});
			} else {
				locals.filters.tag = null;

				switch (locals.template) {
					case 'cards':
						return res.notFound('pageNotFoundTitle', 'cardsInvalidTagText');
					break;

					default:
						return res.notFound('pageNotFoundTitle', 'blogInvalidTagText');
					break;
				}

				return next(true);
			}
		}

		if (! locals.filters.category && ! locals.filters.tag) {
			next();
		}

	});


	// Load all posts
	view.on('init', function(next) {

		var posts = Blog.paginate({
				page: req.query.page || 1,
				perPage: 10,
				maxPages: 10
			})
			.where('state', 'published')
			.sort('-publishedDate')
			.populate('author categories thumbnail');

		if (! locals.default_locale) {
			posts.populate(locals.locale + '.categories');
			posts.populate(locals.locale + '.thumbnail');
		}

		//if (locals.data.category) {
		//	posts.where('categories').in([locals.data.category]);
		//}

		//if (locals.data.tag) {
		//	posts.where('tags').in({
		//		$regex: new RegExp(locals.data.tag),
		//		$options: 'i'
		//	});
		//}

		posts.exec(function(err, results) {
			if (settings.debug) {
				console.log(err, results);
			}

			locals.list = 'Blog';

			async.forEachOf(results.results, function(result, i, cb) {
				helpers.parserBody(locals, result, false, function(err, _result) {
					results.results[i] = _result;
					results.results[i].author = _.omit(_result.author, 'password');

					if (results.results[i].tags.toString().length) {
						results.results[i].tags.forEach(function(tag, index) {
							results.results[i].tags[index] = utils.slug(tag).replace('_', '-');
						});
					} else {
						results.results[i].tags = null;
					}

					cb(err);
				});
			}, function(err) {
				if (settings.debug) {
					console.log(err, results);
				}

				locals.data.posts = results;

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
				helpers.parserMeta(locals, 'data.page', 'data.posts', cb);
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
