var keystone = require('keystone');
var _ = require('lodash');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var has_history = ('Gallery' in settings.revisions) ? true : false;
var add_media = '<a class="btn btn-create" href="javascript:" onclick="window.open(\'/keystone/media\');">Add a new Media</a>';


var Gallery = new keystone.List('Gallery', {
	map: { name: 'name' },
	defaultSort: '-guid',
	path: 'galleries',
	label: 'Galleries',
	singular: 'Gallery',
	plural: 'Galleries',
	history: has_history
});

Gallery.add({
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
		index: true,
		dependsOn: { 'state': 'published' }
	},
	figures: {
		type: Types.Relationship,
		label: 'Figures',
		ref: 'Media',
		many: true,
		index: true,
		note: add_media
	}
});

Gallery.schema.add({
	classes: {},
	data: {}
});

Gallery.relationship({ ref: 'Media', path: 'gallery', refPath: 'figures' });

Gallery.defaultColumns = 'guid|5%, name|20%, author|10%, publishedDate|20%, slides';

Gallery.schema.pre('save', function(next) {
	var self = this;

	if (! this.isNew) {
		return next();
	}

	helpers.getLastCount(Gallery, this, 'guid', function(err, guid) {
		if (err) {
			return next(err);
		}

		self.guid = parseInt(guid) + 1;

		next();
	});
});

Gallery.register();