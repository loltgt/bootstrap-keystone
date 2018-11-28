module.exports = {
      dev: {
        devFile: 'src/js/modernizr.js',
        outputFile: 'public/assets/js/lib/modernizr/modernizr.js',
        options: [ 'setClasses' ],
        tests: [ 'cssvminunit' ],
        uglify: false,
        parseFiles: true,
        files: {
          src: [
            'public/assets/js/**/*.js',
            'public/assets/css/*.css'
          ]
        }
      },
      dist: {
        devFile: 'src/js/modernizr.js',
        outputFile: 'public/assets/js/lib/modernizr/modernizr.min.js',
        options: [ 'setClasses' ],
        tests: [ 'cssvminunit' ],
        uglify: true,
        parseFiles: true,
        files: {
          src: [
            'public/assets/js/**/*.js',
            'public/assets/css/*.css'
          ]
        }
      }
}
