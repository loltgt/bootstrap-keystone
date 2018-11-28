module.exports = {
	serve: {
		tasks: ['nodemon', 'node-inspector', 'watch:js', 'watch:express', 'watch:livereload'],
		options: {
			logConcurrentOutput: true
		}
	},
	dev: {
		tasks: ['watch:scripts_dev', 'watch:sass_dev'],
		options: {
			logConcurrentOutput: true
		}
	},
	dist: {
		tasks: ['watch:scripts_dist', 'watch:sass_dist'],
		options: {
			logConcurrentOutput: true
		}
	}
};
