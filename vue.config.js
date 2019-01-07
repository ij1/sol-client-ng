module.exports = {
  devServer: {
    host: '127.0.0.1',
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
