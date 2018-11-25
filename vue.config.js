module.exports = {
  devServer: {
    host: 'localhost',
    proxy: {
      // proxy all requests starting with /proxy to jsonplaceholder
      '/proxy': {
        target: 'http://www.sailonline.org',
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/proxy': ''
        }
      }
    }
  }

}
