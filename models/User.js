var keystone = require('keystone');
var Types = keystone.Field.Types;


var User = new keystone.List('User', {
	path: 'users',
	label: 'Users',
	singular: 'User',
	plural: 'Users'
});

User.add({
	name: {
		type: Types.Name,
		label: 'Name',
		required: true,
		index: true
	},
	email: {
		type: Types.Email,
		label: 'E-mail',
		initial: true,
		required: true,
		index: true
	},
	password: {
		type: Types.Password,
		label: 'Password',
		initial: true,
		required: true
	},
	group: {
		type: Types.Select,
		label: 'Role',
		options: [
			{ value: 'user', label: 'User' },
			{ value: 'editor', label: 'Editor' },
			{ value: 'admin', label: 'Administrator' }
		],
		default: 'user'
	}
});

User.add('Permissions', {
	isAdmin: {
		type: Types.Boolean,
		label: 'Can access Keystone',
		index: true
	},
	notify: {
		type: Types.Boolean,
		label: 'Send e-mail notification',
		index: true
	}
});

// Provide access to Keystone
User.schema.virtual('canAccessKeystone').get(function() {
	return this.isAdmin;
});

User.relationship({ ref: 'Page', path: 'pages', refPath: 'author' });
User.relationship({ ref: 'Blog', path: 'blog', refPath: 'author' });

User.defaultColumns = 'name, email, group, isAdmin';

User.register();