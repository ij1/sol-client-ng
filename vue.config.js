module.exports = {
  publicPath: process.env.NODE_ENV === 'development' ? '/' : '/static/breezy/',
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
  },
  chainWebpack: config => {
    config.module
      .rule('images')
      .use('url-loader')
        .loader('url-loader')
        .tap(options => {
          options.limit = 1;
          return options;
        })
  },
}
