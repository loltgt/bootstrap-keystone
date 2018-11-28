var keystone = require('keystone');
var jade = require('jade');
var _ = require('lodash');
var async = require('async');
var handlebars = require('handlebars');
var helpers = require('../lib/bkjs/helpers');
var helpers_handlebars = require('../lib/bkjs/handlebars');
var waiter = require('../lib/bkjs/waiter');
var utils = require('keystone-utils');
var settings = keystone.get('settings');


/**
 * Initialises the standard view locals
 */
exports.initLocals = function(req, res, next) {

	var locals = res.locals;

	locals.debug = settings.debug;
	locals.i18n = locals.i18n || false;
	locals.livereload = settings.livereload;
	locals.layout = settings.layout;
	locals.dataset = settings.dataset;
	locals.title = keystone.get('brand');
	locals.navigations = _.merge({}, settings.navigations) || {};
	locals.alternate = {};
	locals.hasHeading = false;
	locals.hasChildren = false;
	locals.user = req.user ? _.omit(req.user, 'password') : false;
	locals.legal = _.merge({}, settings.legal) || false;
	locals.disqus = _.merge({}, settings.disqus) || false;

	locals.meta = {};
	locals.meta.documentAttrs = { 'class': [settings.layout.html_class] };
	locals.meta.headAttributes = {};
	locals.meta.bodyAttrs = { 'class': [settings.layout.body_class] };
	locals.meta.webapp = (settings.webapp && settings.webapp.enable) ? _.merge({}, settings.webapp) : false;

	locals.isAjaxRequest = (req.xhr || (req.headers.accept ? (req.headers.accept.indexOf('json') > -1) : false));
	locals.protocol = req.protocol || 'http';
	locals.port = req.app.settings.port || 3000;

	if (keystone._options.env === 'production') {
		locals.environment = 'dist';
		locals.hostname = req.hostname;

		if (locals.port !== 80 && locals.port !== 443 && locals.port !== 3000) {
			locals.hostname += ':' + locals.port;
		}
	} else {
		locals.environment = 'dev';
		locals.hostname = keystone.get('hostname');
	}
	
	locals.absoluteBasePath = locals.protocol + '://' + locals.hostname;
	locals.absoluteUrl = locals.absoluteBasePath + req.path;

	next();

};


/**
 * Inits the error handler functions into res
 */
exports.initErrorHandlers = function(req, res, next) {

	var locals = res.locals;
	var view = new keystone.View(req, res);

	res.err = function(err, title, message) {
		console.log(err, title, message);

		err = parseInt(err) || 500;
		title = locals.t('errorTitle', { postProcess: 'sprintf', sprintf: [ err ],defaultValue: err + 'Error' });
		message = locals.t('errorText', { defaultValue: 'Sorry, the website has encountered an error.' });

		locals.meta.title = keystone.get('brand') + ' - ' + title;
		locals.meta.bodyAttrs.class.push('error');

		view.render('errors/500', {
			'err': err,
			'errorTitle': title,
			'errorMsg': message
		});

		res.status(err);
	};

	res.notFound = function(title, message, text) {
		console.log(404, title, message);

		title = locals.t(title, { defaultValue: 'Page not found' });

		if (text) {
			text = utils.htmlToText(text);
			text = utils.cropHTMLString(text, 64);
			message = locals.t(message, { postProcess: 'sprintf', sprintf: [ text ], defaultValue: 'Sorry, the page you requested can\'t be found.' });
		} else {
			message = locals.t(message, { defaultValue: 'Sorry, the page you requested can\'t be found.' });
		}

		if (! title) {
			title = locals.t('pageNotFoundTitle', { defaultValue: 'Page not found' });
		}

		if (! message) {
			message = locals.t('pageNotFoundText', { defaultValue: 'Sorry, the page you requested can\'t be found.' });
		}

		locals.meta.title = keystone.get('brand') + ' - ' + title;
		locals.meta.bodyAttrs.class.push('error');
		locals.meta.bodyAttrs.class.push('error-404');

		title = locals.t('errorTitle', { postProcess: 'sprintf', sprintf: [ 404 ], defaultValue: '404 Error' });

		view.render('errors/404', {
			'err': 404,
			'errorTitle': title,
			'errorMsg': message
		});

		res.status(404);
	};

	next();

};


/**
 * Inits parallels
 */
exports.initParallels = function(req, res, next) {

	var locals = res.locals;

	async.auto({
		homepage: function(cb) {
			helpers.getHomePageLink(locals, true, cb);
		},
		navigations: function(cb) {
			helpers.createNavigations(locals, cb);
		},
		languageSelector: function(cb) {
			helpers.createLanguageMenu(locals, cb);
		},
		cookies: function(cb) {
			helpers.getCookies(locals, cb);
		},
		inlineScripts: ['cookies', function(cb, results) {
			helpers.getInlineScripts(locals, cb);
		}]
	}, function(err, results) {
		locals.homepage = results.homepage;
		locals.navigations = results.navigations;
		locals.languageSelector = results.languageSelector;
		locals.inlineScripts = results.inlineScripts;

		next(err);
	});

};


/**
 * Inits Handlebars and helpers
 */
exports.initHandlebars = function(req, res, next) {

	var locals = res.locals;
	locals.handlebars = handlebars;
	locals.waiter = new waiter();


	helpers.registerHandlebarsSyncHelper('email', locals, helpers_handlebars.email);
	helpers.registerHandlebarsSyncHelper('row', locals, helpers_handlebars.row);
	helpers.registerHandlebarsSyncHelper('column', locals, helpers_handlebars.columns);
	helpers.registerHandlebarsSyncHelper('panel', locals, helpers_handlebars.panel);
	helpers.registerHandlebarsSyncHelper('panel-header', locals, helpers_handlebars.panal_header);
	helpers.registerHandlebarsSyncHelper('panel-content', locals, helpers_handlebars.panel_content);

	helpers.registerHandlebarsAsyncHelper('launcher', locals, helpers_handlebars.launcher);
	helpers.registerHandlebarsAsyncHelper('embed', locals, helpers_handlebars.embed);
	helpers.registerHandlebarsAsyncHelper('media', locals, helpers_handlebars.media);
	helpers.registerHandlebarsAsyncHelper('thumbnail', locals, helpers_handlebars.thumbnail);
	helpers.registerHandlebarsAsyncHelper('cards', locals, helpers_handlebars.cards);
	helpers.registerHandlebarsAsyncHelper('gallery', locals, helpers_handlebars.gallery);


	next();

};


/**
 * Inits Widgets
 */
exports.initWidgets = function(req, res, next) {

	var locals = res.locals;

	var WidgetArea = keystone.list('WidgetArea');

	locals.widgets = {};

	var widget_area = WidgetArea.model.find()
		.populate('widgets');

	if (! locals.default_locale) {
		widget_area.populate(locals.locale + '.widgets');
	}

	widget_area.exec(function(err, results) {
		if (settings.debug) {
			console.log(err, results);
		}

		if (err || ! results) {
			return next(err);
		}

		async.each(results, function(result, callback) {
			locals.list = 'WidgetArea';

			helpers.parserBody(locals, result, false, function(err, area) {
				locals.widgets[area.key] = area.toObject() || area;
				locals.widgets[area.key].id = area._id;
				locals.widgets[area.key].classes = [locals.layout.widget_area_class];
				locals.widgets[area.key].classes.push(area.key);

				if (area.widgets.length) {
					locals.widgets[area.key].classes.push(locals.layout.widget_grid_class_prefix + area.widgets.length);
				} else {
					return callback();
				}

				locals.list = 'Widget';

				async.forEachOf(area.widgets, function(widget, widget_i, cb) {
					helpers.parserBody(locals, widget, null, function(err, result) {
						locals.widgets[area.key].widgets[widget_i] = result.toObject() || result;
						locals.widgets[area.key].widgets[widget_i].id = widget._id;
						locals.widgets[area.key].widgets[widget_i].classes = [locals.layout.widget_class];
						locals.widgets[area.key].widgets[widget_i].classes.push(locals.layout.widget_class_prefix + widget.key);

						cb();
					});
				}, function(err) {
					callback(err);
				});
			});
		}, function(err) {
			return next(err);
		});

		if (! locals.widgets) {
			next();
		}
	});

};


/**
 * Fetches and clears the flashMessages before a view is rendered
 */
exports.flashMessages = function(req, res, next) {

	var locals = res.locals;

	var flashMessages = {
		info: req.flash('info'),
		success: req.flash('success'),
		warning: req.flash('warning'),
		error: req.flash('error')
	};

	locals.messages = _.some(flashMessages, function(msgs) { return msgs.length; }) ? flashMessages : false;

	next();

};


/**
 * Prevents people from accessing protected pages when they're not signed in
 */
exports.requireUser = function(req, res, next) {

	if (! req.user) {
		req.flash('error', 'Please sign in to access this page.');
		res.redirect(keystone.get('signin url'));
	} else {
		next();
	}

};
