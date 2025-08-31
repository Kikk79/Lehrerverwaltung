const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const mode = argv?.mode || 'development';

  return {
    target: 'electron-main',
    entry: {
      main: './src/main/main.ts',
      preload: './src/main/preload.ts'
    },
    mode,
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: '[name].js',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@main': path.resolve(__dirname, 'src/main')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.main.json'
            }
          }
        }
      ]
    },
    node: {
      __dirname: false,
      __filename: false
    },
    externals: {
      electron: 'commonjs2 electron',
      'better-sqlite3': 'commonjs2 better-sqlite3'
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode)
      })
    ]
  };
};
