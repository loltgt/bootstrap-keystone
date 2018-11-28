var keystone = require('keystone');
var i18next = require('i18next');
var _ = require('lodash');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var has_history = ('Slideshow' in settings.revisions) ? true : false;
var add_slide = '<a class="btn btn-create" href="javascript:;" onclick="window.open(\'/keystone/slideshow-slides\');">Create a Slide</a>';
var add_media = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/media\');">Add a new Media</a>';


var Slideshow = new keystone.List('Slideshow', {
	map: { name: 'name' },
	defaultSort: '-guid',
	path: 'slideshows',
	label: 'Slideshow',
	singular: 'Slideshow',
	plural: 'Slideshow',
	drilldown: 'slides',
	history: has_history
});

Slideshow.add({
	guid: {
		type: Types.Number,
		label: 'ID',
		noedit: true,
		index: true
	},
	name: {
		type: Types.Text,
		required: true,
		initial: true
	},
	state: {
		type: Types.Select,
		label: 'State',
		options: [
			{ value: 'draft', label: 'Draft' },
			{ value: 'published', label: 'Published' },
			{ value: 'archived', label: 'Archived' }
		],
		default: 'draft',
		index: true
	},
	author: {
		type: Types.Relationship,
		label: 'Author',
		ref: 'User',
		index: true
	},
	publishedDate: {
		type: Types.Datetime,
		label: 'Published date',
		format: settings.date_format,
		default: Date.now,
		index: true
	},
	slides: {
		type: Types.Relationship,
		label: 'Slides',
		ref: 'SlideshowSlide',
		many: true,
		note: add_slide
	}
});

Slideshow.add('Options', {
	fullscreen: {
		type: Types.Boolean,
		label: 'Display as fullscreen'
	},
	autoplay: {
		type: Types.Boolean,
		label: 'Enable autoplay'
	}
});

Slideshow.schema.add({
	attributes: {}
});

Slideshow.defaultColumns = 'guid|5%, name|20%, author|10%, publishedDate|20%, slides';

Slideshow.schema.pre('save', function(next) {
	var self = this;

	if (! this.isNew) {
		return next();
	}

	helpers.getLastCount(Slideshow, this, 'guid', function(err, guid) {
		if (err) {
			return next(err);
		}

		self.guid = parseInt(guid) + 1;

		next();
	});
});

Slideshow.register();


var SlideshowSlide = new keystone.List('SlideshowSlide', {
	map: { name: 'name' },
	path: 'slideshow-slides',
	label: 'Slides',
	singular: 'Slide',
	plural: 'Slides',
	history: has_history
});

SlideshowSlide.add({
	name: {
		type: Types.Text,
		label: 'Name',
		required: true
	},
	type: {
		type: Types.Select,
		label: 'Type',
		options: [
			{ value: 'image', label: 'Image' },
			{ value: 'video', label: 'Video' },
			{ value: 'custom', label: 'Custom' }
		],
		index: true
	},
	//TODO find a way for `embed` type
	media: {
		type: Types.Relationship,
		label: 'Media',
		ref: 'Media',
		filters: { type: ':type' },
		dependsOn: { 'type': ['image', 'video'] },
		note: add_media
	},
	custom: {
		type: Types.Html,
		label: 'Custom HTML',
		wysiwyg: true,
		height: 240,
		dependsOn: { type: 'custom' }
	}
});

SlideshowSlide.add('Caption', {
	hasCaption: {
		type: Types.Boolean,
		label: 'Has a caption'
	},
	caption: {
		title: {
			type: Types.Text,
			label: 'Title',
			dependsOn: { 'hasCaption': true }
		},
		text: {
			type: Types.Html,
			label: 'Text',
			wysiwyg: true,
			height: 240,
			dependsOn: { 'hasCaption': true }
		},
		halign: {
			type: Types.Select,
			label: 'Horizontal alignment',
			options: [
				{ value: 'left', label: 'Left' },
				{ value: 'center', label: 'Center' },
				{ value: 'right', label: 'Right' }
			],
			dependsOn: { 'hasCaption': true }
		},
		valign: {
			type: Types.Select, label: 'Vertical alignment',
			options: [
				{ value: 'top', label: 'Top' },
				{ value: 'middle', label: 'Middle' },
				{ value: 'bottom', label: 'Bottom' }
			],
			dependsOn: { 'hasCaption': true }
		},
		backgroundColor: {
			type: Types.Color,
			label: 'Background (color)',
			dependsOn: { 'hasCaption': true }
		},
		backgroundOpacity: {
			type: Types.Number,
			label: 'Background (opacity)',
			format: '0.00',
			dependsOn: { 'hasCaption': true }
		},
		foregroundColor: {
			type: Types.Color,
			label: 'Text (color)',
			dependsOn: { 'hasCaption': true }
		},
		shadowColor: {
			type: Types.Color,
			label: 'Text shadow (color)',
			dependsOn: { 'hasCaption': true }
		},
		shadowOpacity: {
			type: Types.Number,
			label: 'Text shadow (opacity)',
			format: '0.00',
			dependsOn: { 'hasCaption': true }
		},
		shadowX: {
			type: Types.Number,
			label: 'Text shadow (x px)',
			format: '0',
			dependsOn: { 'hasCaption': true }
		},
		shadowY: {
			type: Types.Number,
			label: 'Text shadow (y px)',
			format: '0',
			dependsOn: { 'hasCaption': true }
		},
		hasLink: {
			type: Types.Boolean,
			label: 'Link all over',
			dependsOn: { 'hasCaption': true }
		},
		link: {
			type: Types.Url,
			label: 'Link',
			dependsOn: { 'hasCaption': true, 'caption.hasLink': true }
		}
	}
});

SlideshowSlide.relationship({ ref: 'Slideshow', path: 'slideshows', refPath: 'slides' });

if (settings.i18n.enable) {
	SlideshowSlide.add('Languages', helpers.addLanguageSupport(SlideshowSlide, settings.i18n.lists.SlideshowSlide));
}

SlideshowSlide.schema.add({
	caption: {
		attributes: {}
	}
});

SlideshowSlide.defaultColumns = 'name, type|10%, hasCaption|20%, caption.title';

SlideshowSlide.register();