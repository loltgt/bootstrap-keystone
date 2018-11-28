module.exports = {
      options: {
        separator: ';',
        sourceMap: true
      },
      dev: {
        src: [
          'src/js/init.js'
        ],
        dest: 'public/assets/js/app.js'
      },
      dist: {
        src: [
          'src/tmp/js/init.min.js'
        ],
        dest: 'public/assets/js/app.js'
      }
}
