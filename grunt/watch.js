module.exports = {
	js: {
		files: [
			'model/**/*.js',
			'routes/**/*.js'
		],
		tasks: ['jshint:all']
	},
	express: {
		files: [
			'keystone.js',
			'public/assets/js/lib/**/*.{js,json}'
		],
		tasks: ['jshint:server']
	},
	scripts_dev: {
		files: ['src/js/**/*.js'],
		tasks: ['concat:dev']
	},
	sass_dev: {
		files: ['src/scss/**/*.scss'],
		tasks: ['sass:dev']
	},
	scripts_dist: {
		files: ['src/js/**/*.js'],
		tasks: ['concat:dist']
	},
	sass_dist: {
		files: ['src/scss/**/*.scss'],
		tasks: ['sass:dist']
	},
	livereload: {
		files: [
			'src/scss/**/*.css',
			'src/js/**/*.js',
			'templates/**/*.jade'
		],
		options: {
			livereload: true
		}
	}
};
