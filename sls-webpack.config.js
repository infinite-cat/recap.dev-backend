const path = require('path')
const slsw = require('serverless-webpack')

module.exports = {
  entry: slsw.lib.entries,
  externals: [
    /aws-sdk/,
  ],
  mode: 'development',
  target: 'node',
  resolve: {
    mainFields: ['main'],
    extensions: [
      '.js',
      '.json',
      '.ts',
      '.tsx',
      '.mjs',
    ],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test(modulePath) {
          return modulePath.endsWith('.ts') && !modulePath.endsWith('test.ts')
        },
        use: [
          {
            loader: 'ts-loader',
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
