/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Webpack configuration options common to both production and development versions.
 */

const HtmlWebpackPlugin = require("html-webpack-plugin");

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  module: {
    // NB: Before Webpack 2, "rules" was called "modules".
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
            options: { minimize: true }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  plugins: [
    // This will inject the necessary <script> tag, with a link to the bundle, into the index.html file
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "./index.html",
      inject: "body"
    })

    // Comment out to include moment locales, uncomment to exclude them.
    // new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

    // Very useful to profile the size of included modules:
    // new BundleAnalyzerPlugin(),
  ]
};
