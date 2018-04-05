/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * Webpack configuration options common to both production and development versions.
 */

const path = require("path");
const webpack = require("webpack");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const src_dir = path.resolve(__dirname, "src");
const dist_dir = path.resolve(__dirname, "dist");

module.exports = {
  entry: ["./src/index.js"],
  output: {
    path: dist_dir,
    filename: "index_bundle.js"
  },
  module: {
    // NB: Before Webpack 2, "rules" was called "modules".
    rules: [
      {
        test: /\.js$/,
        include: src_dir,
        // use    : ["babel-loader"]
        // The source-map-loader does not seem to be working. Perhaps it needs to be used in the libraries as well?
        use: ["source-map-loader", "babel-loader"]
      },
      {
        test: /\.css$/,
        include: src_dir,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  plugins: [
    // This will clean (delete) the destination directory before the build
    // new CleanWebpackPlugin(['dist']),
    // This will inject the necessary <script> tag, with a link to the bundle, into the index.html file
    new HtmlWebpackPlugin({
      template: path.resolve(src_dir, "index.html"),
      filename: "index.html",
      inject: "body"
    })

    // Comment out to include moment locales, uncomment to exclude them.
    // new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

    // Very useful to profile the size of included modules:
    // new BundleAnalyzerPlugin(),
  ]
};
