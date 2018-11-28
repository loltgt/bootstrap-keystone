var keystone = require('keystone');
var Types = keystone.Field.Types;
var helpers = require('../lib/bkjs/helpers');
var settings = keystone.get('settings');

var upload_private_path = helpers.getUploadPrivatePath();
var enable_thumbnails = ((settings.thumbnails && settings.thumbnails.enable) ? true : false);
var add_gallery = '<a class="btn btn-create" href="javascript:;" onclick="window.open(\'/keystone/galleries\');">Create a gallery</a>';


var Media = new keystone.List('Media', {
	map: { name: 'title' },
	defaultSort: '-guid',
	path: 'media',
	label: 'Media',
	singular: 'Media',
	plural: 'Media'
});

Media.add({
	guid: {
		type: Types.Number,
		label: 'ID',
		noedit: true,
		index: true
	},
	title: {
		type: Types.Text,
		label: 'Title',
		required: false
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
	type: {
		type: Types.Select,
		label: 'Type',
		options: [
			{ value: 'image', label: 'Image' },
			{ value: 'video', label: 'Video' },
			{ value: 'audio', label: 'Audio' },
			{ value: 'embed', label: 'Embed' }
		],
		index: true
	},
	image: {
		landscape: {
			type: Types.LocalFile,
			label: 'Image landscape',
			dest: upload_private_path,
			allowedTypes: ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			dependsOn: { 'type': 'image' }
		},
		portrait: {
			type: Types.LocalFile,
			label: 'Image portrait',
			dest: upload_private_path,
			allowedTypes: ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'image' }
		},
		caption: {
			type: Types.Html,
			label: 'Caption',
			wysiwyg: true,
			height: 180,
			collapse: true,
			dependsOn: { 'type': 'image' }
		}
	},
	video: {
		mp4: {
			type: Types.LocalFile,
			label: 'Video MPEG-4/AAC',
			dest: upload_private_path,
			allowedTypes: ['video/mp4', 'video/x-m4v', 'video/mp4v-es'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'video' }
		},
		webm: {
			type: Types.LocalFile,
			label: 'Video WebM/Theora',
			dest: upload_private_path,
			allowedTypes: ['video/webm', 'video/x-theora+ogg'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'video' }
		},
		ogg: {
			type: Types.LocalFile,
			label: 'Video OGG',
			dest: upload_private_path,
			allowedTypes: ['video/ogg'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'video' }
		},
		flv: {
			type: Types.LocalFile,
			label: 'Video FLV (Flash fallback)',
			dest: upload_private_path,
			allowedTypes: ['video/x-flv', 'video/x-f4v'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'video' }
		},
		poster: {
			type: Types.LocalFile,
			label: 'Poster image',
			dest: upload_private_path,
			allowedTypes: ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'video' }
		}
	},
	audio: {
		mp3: {
			type: Types.LocalFile,
			label: 'Audio MP3',
			dest: upload_private_path,
			allowedTypes: ['audio/mp3', 'audio/x-mp3'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'audio' }
		},
		aac: {
			type: Types.LocalFile,
			label: 'Audio MPEG-4/AAC',
			dest: upload_private_path,
			allowedTypes: ['audio/aac', 'audio/mp4', 'audio/x-mp4'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'audio' }
		},
		ogg: {
			type: Types.LocalFile,
			label: 'Audio OGG',
			dest: upload_private_path,
			allowedTypes: ['audio/ogg', 'audio/x-vorbis', 'video/ogg'],
			filename: function(item, file) {
				return helpers.getLocalFileFilename(item, file);
			},
			format: function(item, file) {
				return helpers.getLocalFileFormat(item, file);
			},
			collapse: true,
			dependsOn: { 'type': 'audio' }
		}
	},
	embed: {
		path: {
			type: Types.Code, 
			label: 'Embed URL/HTML',
			height: 64,
			dependsOn: { 'type': 'embed' }
		},
		source: {
			type: Types.Embedly,
			label: 'Preview',
			from: 'embed.path',
			dependsOn: { 'type': 'embed' }
		}
	},
	alternate: {
		type: Types.Text,
		label: 'Alternate text'
	},
	showCaption: {
		type: Types.Boolean,
		label: 'Enable caption',
		value: 'checked',
		default: false,
		index: true,
		dependsOn: { 'type': ['image', 'embed'] }
	},
	hasThumbnail: {
		type: Types.Boolean,
		label: 'Create a thumbnail',
		value: 'checked',
		default: true,
		index: true,
		hide: (! enable_thumbnails),
		dependsOn: { 'type': 'image' }
	}
});

if (settings.i18n.enable) {
	Media.add('Languages', helpers.addLanguageSupport(Media, settings.i18n.lists.Media));	
}

Media.schema.methods.thumb = function(size) {
	return helpers.getMediaThumbnail(this, size);
};

Media.schema.virtual('_thumbnail').get(function() {
	return helpers.getMediaAdminThumbnail(this);
});

Media.relationship({
	ref: 'Gallery',
	refPath: 'media'
});

Media.schema.add({
	image: {
		attributes: {},
		landscape: {
			class: []
		},
		portrait: {
			class: []
		}
	},
	video: {
		attributes: {}
	},
	audio: {
		attributes: {}
	},
	embed: {
		attributes: {},
		html: ''
	}
});

Media.defaultColumns = 'guid|5%, _thumbnail, source|10%, title, type|10%, author|10%, publishedDate|20%';

Media.schema.pre('save', function(next) {
	var self = this;

	if (! this.isNew) {
		return next();
	}

	helpers.getLastCount(Media, this, 'guid', function(err, guid) {
		if (err) {
			return next(err);
		}

		self.guid = parseInt(guid) + 1;

		next();
	});
});

Media.schema.post('save', function() {
	if (enable_thumbnails && this.hasThumbnail) {
		helpers.createMediaThumbnails(this);
	}
});

Media.register();