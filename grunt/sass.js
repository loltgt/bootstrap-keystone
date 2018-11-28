module.exports = {
      options: {
        loadPath: [
          'bower_components/'
        ]
      },
      dev: {
        options: {
          debugInfo: false,
          style: 'nested'
        },
        files: {
          'public/assets/css/app.css': 'src/scss/app.scss',
          'public/assets/css/admin.css': 'src/scss/admin.scss',
          'public/tinymce/editor.css': 'src/scss/editor.scss'
        }
      },
      dist: {
        options: {
          debugInfo: false,
          style: 'compressed'
        },
        files: {
          'public/assets/css/app.css': 'src/scss/app.scss',
          'public/assets/css/admin.min.css': 'src/scss/admin.scss',
          'public/tinymce/editor.min.css': 'src/scss/editor.scss'
        }
      }
}
