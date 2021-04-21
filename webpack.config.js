const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/main.ts",
  optimization: {
    minimize: false
  },
  output: {
      path: path.join(process.cwd(),'src','dist'),
      filename: "bundle.js"
  },
  watch: true,
  resolve: {
      modules: [path.resolve(__dirname,'node_modules'), 'node_modules'],
      // Add '.ts' and '.tsx' as a resolvable extension.
      extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"],
      alias: {
        buffer: "buffer"
      }
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new CopyPlugin({
      patterns: [
        { from: "node_modules/font-awesome/fonts", to: "fonts" },
        { from: "src/temp/css", to: "css"}
      ]
    })
  ],
  module: {
      rules: [
          // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
          { test: /\.tsx?$/, loader: "ts-loader" }
      ]
  }
};