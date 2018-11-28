require('dotenv').load();

// Require keystone
var keystone = require('keystone');

var _environment = process ? process.env : null;
var _env = keystone._options.env;
var _debug = (_env === 'production') ? false : true;

keystone.render = require('./admin/render');

keystone.init({

	'name': 'Bootstrap KeystoneJS 3',
	'brand': 'Bootstrap KeystoneJS 3',
	'hostname': 'localhost:3000',

	'sass': 'src/scss/',
	'static': 'public/',
	'favicon': 'public/favicon.ico',
	'views': 'templates/views/',
	'view engine': 'jade',

	'auto update': true,
	'session': true,
	'auth': true,
	'user model': 'User',
	'file limit': '10mb',
	'signin url': '/keystone/signin/',
	'signout url': '/keystone/signout/',

	'emails': 'templates/emails',
	'email transport': 'mailgun',
	'mailgun api key': process.env.MAILGUN_API_KEY,
	'mailgun domain': process.env.MAILGUN_DOMAIN,

	'wysiwyg override toolbar': true,
	'wysiwyg additional buttons': 'formatselect removeformat, bold italic, alignleft aligncenter alignright alignjustify, bullist numlist, link image blockquote table, charmap code, tinyvision',
	'wysiwyg additional plugins': 'importcss, image, table, charmap, wordcount',
	'wysiwyg additional options': {
		'content_css': '/tinymce/editor.min.css',
		'skin_url': '/tinymce/skins/{TINYMCE_SKIN}',
		'allow_script_urls': true,
		'convert_urls': false,
		'extended_valid_elements': '@[id|class|style|title|itemscope|itemtype|itemprop|datetime|rel],div,dl,ul,dt,dd,li,span,a[rev|charset|href|lang|tabindex|accesskey|type|name|href|target|title|class|onfocus|onblur],img[class|!src|alt|style]',
		'invalid_elements': 'b,frame',
		'visual': true,
		'external_plugins': {
			'tinyvision': '/tinymce/plugins/tinyvision/plugin.min.js'
		},
		'tinyvision': {
			'source': '/api/images',
			'upload': function () {
				tinymce.activeEditor.windowManager.alert(message);
			}
		}
	}

});

if (_env === 'production') {
	keystone.set('session store', 'mongo');
	keystone.set('unix socket', '/run/nginx/keystone.sock');
	keystone.set('trust proxy', true);
	keystone.set('compress', true);
}

keystone.set('settings', {

	'debug': false,
	'livereload': true,
	'parse_handlebars': true,

	'date_format': 'DD/MM/YYYY HH:ss',
	'upload_do_ym': true,
	'upload_do_rename': false,
	'upload_path': 'uploads/',
	'inline_config_file': 'locales/config.js',
	'revisions': ['Page', 'Blog', 'Portfolio'],

	'nginx': {
		'enable': (_env === 'production') ? true : false,
		'hostname': 'localhost:3000',
		'port': 80,
		'cache': {
			'enable': true,
			'bypass_headers': {
				'Cache-Control': 'no-cache'
			}
		}
	},

	'homepage': 'home',
	'blog': 'blog',
	'portfolio': 'portfolio',

	'navigations': ['header', 'footer'],

	'templates': [
		{ 'value': 'modal', 'label': 'Modal' },
		{ 'value': 'cards', 'label': 'Cards' }
	],

	'customizer': {
		'enable': true,
		'layouts': [
			{ 'value': '', 'label': 'Default' },
			{ 'value': 'full-width', 'label': 'Full width' },
			{ 'value': 'custom', 'label': 'Custom' },
			{ 'value': 'off-white', 'label': 'White/Grey' },
			{ 'value': 'grey-20', 'label': 'Grey (20%)' },
			{ 'value': 'grey-40', 'label': 'Grey (40%)' },
			{ 'value': 'grey-60', 'label': 'Grey (60%)' },
			{ 'value': 'grey-80', 'label': 'Grey (80%)' },
			{ 'value': 'grey-100', 'label': 'Grey (100%)' }
		],
		'wider': [ 'full-width', 'custom' ]
	},

	'i18n': {
		'enable': false,
		'options': {
			'ns': 'bkjs',
			'defaultNS': 'bkjs',
			'whitelist':  ['it_IT', 'en_US'],
			'fallbackLng': 'en_US',
			'saveMissing': false,
			'backend': {
				'loadPath': __dirname + '/locales/{{lng}}/{{ns}}.json',
				'addPath': __dirname + '/locales/{{lng}}/{{ns}}.missing.json'
			},
			'detection': {
				'removeLngFromUrl': true
			},
			'debug': _debug
		},
		'locales': {
			'it': 'it_IT',
			'en': 'en_US'
		},
		'languages': {
			'it_IT': 'Italiano',
			'en_US': 'English'
		},
		'directions': {
			'it_IT': 'ltr',
			'en_US': 'ltr'
		},
		'lists': {
			'Page': ['title', 'slug', 'content.html', 'heading'],
			'Blog': ['title', 'slug', 'content.brief', 'content.extended', 'thumbnail', 'thumbnail.alternate', 'tags'],
			'BlogCategory': ['name', 'key'],
			'Media': ['alternate'],
			'Portfolio': ['title', 'slug', 'content.html', 'thumbnail', 'thumbnail.alternate', 'features'],
			'PortfolioType': ['name', 'key'],
			'SlideshowSlide': ['caption.title', 'caption.text', 'caption.link'],
			'WidgetArea': ['title', 'widgets'],
			'Widget': ['title', 'content']
		},
		'paths': {
			'Blog': {
				'it_IT': 'blog',
				'en_US': 'blog'
			},
			'Portfolio': {
				'it_IT': 'portfolio',
				'en_US': 'portfolio'
			}
		},
		'default_locale': 'it_IT'
	},

	'thumbnails': {
		'enable': true,
		'quality': 75,
		'sizes': {
			'small': { 'width': 320, 'height': 240 },
			'medium': { 'width': 640, 'height': 480 },
			'medium_cropped': { 'width': 640,'height': 640, 'crop': true },
			'large': { 'width': 1280, 'height': 720 }
		}
	},

	'seo': {
		'enable': true,
		'site_name': null,
		'keywords_support': true,
		'images_support': true,
		'default_image': false,
		'thumbnail_size': 'large',
		'providers': {
			'twitter': true,
			'opengraph': true,
			'schema.org': true
		},
		'custom': {
			'twitter': true,
			'opengraph': true
		}
	},

	'widgets': {
		'enable': true,
		'editable_areas': false
	},

	'disqus': {
		'enable': true,
		'username': '',
		'counter': false
	},

	'twitter': {
		'site': 'Bootstrap Keystone 3',
		'domain': 'Bootstrap Keystone 3',
		'creator': 'Bootstrap Keystone 3'
	},

	'google': {
		'plus': {
			'publisher': ''
		}
	},

	'legal': {
		'copyright': {
			'enable': true,
			'owner': 'Bootstrap Keystone 3',
			'year': new Date().getFullYear()
		},
		'vat': {
			'enable': true,
			'vatin': ''
		},
		'cookies': {
			'enable': true,
			'discard': 'cookie_consent_discard',
			'href': {
				'_id': (_env === 'production') ? '{PAGE_ID}' : '{PAGE_ID}'
			},
			'title': 'Cookie Policy',
			'target': '_blank',
			'text': 'Cookie Policy'
		},
		'notes': {
			'enable': false
		}
	},

	'webapp': {
		'enable': true,
		'name': 'Bootstrap Keystone 3',
		'ios_status_bar_style': 'black'
	},

	'layout': {
		'row_class': 'row',
		'column_class_prefix': 'col-',
		'small_class_prefix': 'sm-',
		'medium_class_prefix': 'md-',
		'large_class_prefix': 'lg-',
		'offset_class_suffix': 'off',
		'push_class_suffix': 'push',
		'centered_class_suffix': 'centered',
		'html_class': 'no-js',
		'body_class': 'offcanvas',
		'page_class': 'page',
		'page_parent_class': 'page-parent',
		'page_child_class': 'page-child',
		'page_content_class': 'page-content',
		'page_template_class': 'page-template',
		'page_template_class_prefix': 'page-template-',
		'page_template_archive_class_prefix': 'page-template-archive-',
		'page_has_heading_class': 'page-heading',
		'page_customizer_layout_class': 'page-layout',
		'page_customizer_layout_class_prefix': 'page-layout-',
		'page_customizer_styled_class': 'custom',
		'homepage_class': 'home',
		'archive_class': 'archive',
		'single_class': 'single',
		'single_template_class_prefix': 'single-',
		'post_class': 'post',
		'media_class': 'media',
		'media_class_prefix': 'media-',
		'image_class': 'image',
		'audio_class': 'audio',
		'video_class': 'video',
		'embed_class': 'embed',
		'gallery_class': 'gallery',
		'gallery_class_prefix': 'gallery-',
		'gallery_column_class_prefix': 'gallery-grid-',
		'caption_class': 'caption',
		'caption_halign_class_prefix': 'x-',
		'caption_valign_class_prefix': 'y-',
		'caption_overlay_class': 'overlay',
		'caption_button_class': 'btn',
		'caption_custom_class': 'custom',
		'cta_class': 'call-to-action',
		'slideshow_class': 'slideshow',
		'slideshow_class_prefix': 'slideshow-',
		'slideshow_singular_class': 'once',
		'slideshow_fullscreen_class': 'full',
		'slide_class': 'item',
		'slide_item_class': 'owl-item',
		'slide_item_lazy_class': 'owl-lazy',
		'slider_class': 'slider',
		'gobottom_class': 'go-to-bottom',
		'adaptive_class': 'adaptive',
		'responsive_class': 'responsive',
		'landscape_class': 'show-for-landscape',
		'portrait_class': 'show-for-portrait',
		'embed_responsive_class': 'embed-responsive',
		'embed_responsive_class_prefix': 'embed-responsive-',
		'embed_responsive_content_class': 'embed-responsive-item',
		'grid_class': 'grid-item',
		'grid_class_width_prefix': 'grid-item--width',
		'grid_class_height_prefix': 'grid-item--height',
		'icon_class_prefix': 'icon-',
		'widget_area_class': 'widget-area',
		'widget_class': 'widget',
		'widget_class_prefix': 'widget-',
		'widget_grid_class_prefix': 'widget-grid-',
		'modal_class': 'modal-dialog',
		'modal_hide_class': 'mfp-hide',
		'share_class': 'share',
		'share_modal_class': 'modal-share',
		'share_link_class': 'share-link',
		'share_label_class': 'share-label',
		'share_action_class': 'share-action',
		'share_action_icon_class': 'icon-share',
		'share_icon_class': 'share-icon',
		'share_intent_class': 'share-intent',
	},

	'dataset': {
		'options': 'data-options',
		'fullscreen': 'data-fullscreen',
		'background': 'data-background',
		'foreground': 'data-foreground',
		'color': 'data-color',
		'shadow': 'data-shadow',
		'image_src': 'data-src',
		'image_src_lazy': 'data-src-retina'
	}

});

keystone.import('models');

keystone.set('locals', {
	'_': require('underscore'),
	'env': keystone.get('env'),
	'utils': keystone.utils,
	'editable': keystone.content.editable
});

keystone.set('routes', require('./routes'));

keystone.set('nav', {
	'pages': ['pages', 'child-pages'],
	'blog': ['blog', 'blog-categories'],
	'portfolio': ['portfolio', 'portfolio-types'],
	'slideshows': ['slideshows', 'slideshow-slides'],
	'media': ['media', 'galleries'],
	'navigation': ['navigation', 'menu-items'],
	'widgets': ['widgets', 'widgets-manager'],
	'users': 'users'
});

keystone.set('signin redirect', function(user, req, res) {
	res.cookie('keystone.isLoggedIn', '1');
	res.redirect('/keystone/');
});

keystone.set('signout redirect', function(req, res) {
	res.clearCookie('keystone.isLoggedIn');
	res.redirect('/keystone/');
});

keystone.start();