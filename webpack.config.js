const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  // 1. 入口文件从 .js 改为 .ts
  entry: {
    main: './src/index.ts',
    worker: './src/worker.worker.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: (pathData) => {
      return pathData.chunk.name === 'worker'
        ? 'ways.worker.js'
        : 'ways.js';
    },
    library: {
      name: 'WAYS',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
    publicPath: '/dist/',
  },
  // 2. 添加 resolve 配置，让 webpack 能够识别 .ts 扩展名
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        // 3. 将规则从处理 .js 改为处理 .ts
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  // devtool, optimization, devServer 等其余配置可以保持不变 ...
  devtool: isProduction ? false : 'source-map',
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false,
            drop_debugger: false,
          },
          mangle: true,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  target: 'web',
  devServer: {
    static: {
      directory: path.join(__dirname, 'test'),
      publicPath: '/',
    },
    port: 8080,
    open: true,
    hot: false,
    liveReload: true,
    devMiddleware: {
      writeToDisk: true,
    },
  },
};