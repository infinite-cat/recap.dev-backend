const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/index.ts',
  watch: true,
  mode: 'development',
  target: 'node',
  externals: {
    'sqlite3': 'sqlite3',
    'mariasql': 'mariasql',
    'mssql': 'mssql',
    'tedious': 'tedious',
    'mysql': 'mysql',
    'mysql2': 'mysql2',
    'mssql/package.json': 'mssql/package.json',
    'mssql/lib/base': 'mssql/lib/base',
    'oracle': 'oracle',
    'strong-oracle': 'strong-oracle',
    'oracledb': 'oracledb',
    'pg-query-stream': 'pg-query-stream'
  },
  resolve: {
    extensions: [
      '.js',
      '.json',
      '.ts',
      '.tsx',
      '.mjs',
    ],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new webpack.IgnorePlugin(/^pg-native$/)
  ],
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            },
          },
        ],
      },
      {
        type: 'javascript/auto',
        test: /\.mjs$/,
        use: [],
      },
    ],
  },
}
