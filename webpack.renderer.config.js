const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    target: 'electron-renderer',
    entry: './src/renderer/index.tsx',
    mode: argv.mode || 'development',
    output: {
      path: path.resolve(__dirname, 'dist/renderer'),
      filename: 'renderer.js',
      clean: true
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@renderer': path.resolve(__dirname, 'src/renderer')
      },
      fallback: {
        "path": require.resolve("path-browserify"),
        "fs": false,
        "crypto": false,
        "buffer": require.resolve("buffer"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util")
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.renderer.json'
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.(png|jpg|gif|svg)$/,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        filename: 'index.html'
      }),
      new webpack.ProvidePlugin({
        global: 'global',
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser'
      }),
      new webpack.DefinePlugin({
        global: 'globalThis'
      }),
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'styles.css'
        })
      ] : [])
    ],
    devServer: {
      static: path.join(__dirname, 'dist/renderer'),
      port: 3001,
      hot: true,
      historyApiFallback: true
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map'
  };
};