var keystone = require('keystone');
var _ = require('lodash');
var jade = require('jade');
var async = require('async');
var utils = require('keystone-utils');
var moment = require('moment');
var htmlparser = require('htmlparser2');
var settings = keystone.get('settings');
var qs = require('qs');


exports = module.exports = function(req, res) {
	var Page = keystone.list('Page');
	var User = keystone.list(keystone.get('user model'));

	var view = new keystone.View(req, res);
	var locals = res.locals;


	// Set locals
	locals.page = req.query.page || null;
	locals.lang = req.query.lang || null;
	locals.formData = req.body || null;
	locals.formBody = {};
	locals.return = [];
	locals.error = true;


	if (settings.i18n.enable && settings.i18n.default_locale) {
		if (! locals.lang in settings.i18n.languages) {
			return res.err();
		}
	}

	if (! locals.page) {
		return res.notfound('pageNotFoundTitle', 'pageNotFoundText');
	}

	if (typeof locals.formData !== 'object') {
		return res.err();
	} else if (locals.isAjaxRequest) {
		if (! locals.formData.modal || locals.formData.referral !== req.get('Referrer')) {
			return res.err();
		} else {
			locals.formData = qs.parse(locals.formData.body);
		}
	}


	// Validation form
	view.on('init', function(next) {
		var slug = 'slug';

		if (! locals.default_locale) {
			slug = locals.locale + '.' + slug;
		}

		var page = Page.model.findOne()
			.where('state', 'published')
			.where(slug, locals.page);

		page.exec(function(err, result) {
			if (settings.debug) {
				console.log(err, result);
			}

			if (err || ! result) {
				locals.return = [{
					'type': 'warning',
					'message': locals.t('pageNotFoundTitle', { defaultValue: 'Page not found' }) + '.'
				}];

				return next(err);
			}

			var parser = new htmlparser.Parser({
				onopentag: function(name, attributes) {
					if (name !== 'input' && name !== 'textarea' && name !== 'select') {
						return;
					}

					if (! attributes.name in locals.formData) {
						return;
					}

					locals.formBody[attributes.name] = {
						'type': attributes.type || name,
						'name': (attributes['data-name'] || attributes.placeholder || attributes.name),
						'pattern': attributes.pattern || null,
						'value': null,
						'required': (attributes.required !== undefined ? true : false)
					};
				}
			});

			parser.write(result);
			parser.end();

			if (settings.debug) {
				console.log('formData', locals.formData);
				console.log('formBody', locals.formBody);
			}

			if (locals.return.length) {
				return next(true);
			} else {
				locals.return = [];
			}

			if (! _.isEqual(Object.keys(locals.formBody), Object.keys(locals.formData))) {
				locals.return = [{
					'type': 'warning',
					'message': locals.t('formValidationUnmatchedValues', { defaultValue: 'Warning, unmatched values.' })
				}];

				return next();
			}

			async.eachOf(locals.formData, function(value, name, cb) {
				value = utils.htmlToText(value);

				switch (locals.formBody[name].type) {
					case 'email':
						if ((locals.formBody[name].required || value) && ! utils.isEmail(value)) {
							locals.return.push({
								'type': 'error',
								'message': locals.t('formValidationInvalidEmail', { defaultValue: 'The e-mail address you have entered is not valid.' })
							});
						} else {
							value = '<a href="' + value + '">' + value + '</a>';
						}
					break;

					case 'text':
					case 'textarea':
						if (locals.formBody[name].required && ! value) {
							locals.return.push({
								'type': 'error',
								'message': locals.t('formValidationInvalidText', { defaultValue: 'The text you have entered is not valid.' })
							});
						}
					break;

					case 'select':
					case 'radio':
					case 'checkbox':
						if (locals.formBody[name].required && ! value) {
							locals.return.push({
								'type': 'error',
								'message': locals.t('formValidationInvalidOption', { defaultValue: 'The selected value is not valid.' })
							});
						}
					break;

					default:
						value = null;

						locals.return.push({
							'type': 'error',
							'message': locals.t('formValidationInvalidType', { defaultValue: 'Error, unknown field type.' })
						});
					break;
				}

				if (locals.formBody[name].pattern) {
					var regex = new RegEx(locals.formBody[name].pattern);

					if (! regex && ! value.match(regex)) {
						locals.return.push({
							'type': 'error',
							'message': locals.t('formValidationInvalidValue', { postProcess: 'sprintf', sprintf: [ locals.formBody[name] ], defaultValue: 'Invalid value.' })
						});

						return cb(true);
					}
				}

				locals.formBody[name].value = value;

				cb(null);
			}, function(err) {
				next(err);
			});

		});
	});
	

	// Send form
	//view.on('post', { action: 'contact' }, function(next) {
	view.on('init', function(next) {
		if (locals.return.length) {
			return next(true);
		}

		var user = User.model.find()
			.where('notify', true);

		user.exec(function (err, recipients) {
			if (settings.debug) {
				console.log(err, recipients);
			}

			if (err || ! recipients) {
				locals.return = [{
					'type': 'warning',
					'message': locals.t('sendErrorRecipientsNotFound', { defaultValue: 'Warning, recipients not found.' })
				}];

				return next(true);
			}

			new keystone.Email({
				'templateName': 'message'
			}).send({
				'to': recipients,
				'from': {
					'name': keystone.get('brand'),
					'email': '{EMAIL_ADDRESS}',
				},
				'subject': locals.t('sendMessageSubject', { defaultValue: 'New message from the website' }),
				'data': locals.formBody,
				'timestamp': moment()
			}, function(err, info) {
				if (settings.debug) {
					console.log(err, info);
				}

				//TODO FIX workaround
				if (! err) {
					locals.error = false;
				}

				next(err);
			});

		});
	});

	// Output
	view.render(function(err, req, res) {

		err = (! locals.error) ? false : err;

		if (! locals.return.length) {
			if (err) {
				locals.return = [{
					'type': 'error',
					'message': locals.t('sendResponseError', { defaultValue: 'Sorry, there was a problem sending your message.' })
				}];
			} else {
				locals.return = [{
					'type': 'success',
					'message': locals.t('sendResponseSuccess', { defaultValue: 'Message sent successfully! Thank you.' })
				}];
			}
		}

		if (locals.isAjaxRequest) {
			res.apiResponse({
				'data': locals.return,
				'error': err || false
			});
		} else {
			async.each(locals.return, function(item, cb) {
				req.flash(item.type, item.message);

				cb();
			}, function() {
				res.redirect('back');
			});
		}

	});
	
};
