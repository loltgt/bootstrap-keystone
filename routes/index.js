var keystone = require('keystone');
var i18next = require('i18next');
var i18nextFilesystemBackend = require('i18next-node-fs-backend');
var i18nextSprintf = require('i18next-sprintf-postprocessor');
var i18nextMiddleware = require('i18next-express-middleware');
var middleware = require('./middleware');
var importRoutes = keystone.importer(__dirname);
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

// apply patches
keystone.Field.Types.LocalFile.prototype.href = helpers.getLocalFileHref;
keystone.Field.Types.LocalFiles.prototype.href = helpers.getLocalFileHref;
keystone.List.prototype.selectColumns = helpers.listSelectColumns;

// initialize
keystone.pre('routes', middleware.initLocals);
keystone.pre('routes', middleware.initErrorHandlers);

// add i18n support
if (settings.i18n && settings.i18n.enable) {
	i18next.use(i18nextMiddleware.LanguageDetector);
	i18next.use(i18nextFilesystemBackend);
	i18next.use(i18nextSprintf);
	i18next.init(settings.i18n.options);
	keystone.pre('routes', i18nextMiddleware.handle(i18next));
	keystone.pre('routes', helpers.localeRoute);
} else {
	//TODO add fallback
}

// commons
keystone.pre('render', middleware.initParallels);
keystone.pre('render', middleware.flashMessages);

// Handlebars
if (settings.parse_handlebars) {
	keystone.pre('routes', middleware.initHandlebars);
}

// Widgets
if (settings.widgets && settings.widgets.enable) {
	keystone.pre('render', middleware.initWidgets);
}

keystone.set('404', function(req, res, next) {
	res.notfound();
});

keystone.set('500', function(err, req, res, next) {
	var title, message;

	if (err instanceof Error) {
		message = err.message;
		err = err.stack;
	}

	res.err(err, title, message);
});

// Import Route Controllers
var routes = {
	views: importRoutes('./views'),
	api: importRoutes('./api')
};

// Setup Route Bindings
exports = module.exports = function(app) {

	app.disable('x-powered-by');

	app.get('/api/images', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.images);
	app.all('/api/send', [keystone.middleware.api, keystone.middleware.cors], routes.api.send);

	app.get('/', routes.views.page);

	app.all('/blog/', routes.views.blog);
	app.get('/blog/category\\::category?/', routes.views.blog);
	app.get('/blog/tag\\::tag?/', routes.views.blog);
	app.get('/blog/:year?/:month?/:post?/', routes.views.post);

	app.get('/portfolio/', routes.views.portfolio);
	app.get('/portfolio/type\\::type?/', routes.views.portfolio);
	app.get('/portfolio/:project?/', routes.views.project);

	app.get('/:page/:child?/', routes.views.page);

};
