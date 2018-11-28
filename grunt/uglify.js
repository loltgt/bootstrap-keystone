module.exports = {
      options: {
        preserveComments: 'some',
        sourceMap: true
      },
      lib: {
        files: {
          'locales/config.js': ['src/js/config.js']
        }
      },
      admin: {
        files: {
          'public/assets/js/admin.min.js': ['public/assets/js/admin.js']
        }
      },
      app: {
        files: {
          'src/tmp/js/init.min.js': ['src/js/init.js']
        }
      }
}
