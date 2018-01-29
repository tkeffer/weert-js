/*
 * Webpack configuration options common to both production and development versions.
 */

const path                 = require('path');
const webpack              = require('webpack');
const CleanWebpackPlugin   = require('clean-webpack-plugin');
const HtmlWebpackPlugin    = require('html-webpack-plugin');

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const src_dir  = path.resolve(__dirname, 'client/src');
const dist_dir = path.resolve(__dirname, 'client/dist');

module.exports = {
    entry  : [
        './client/src/index.js'
    ],
    output : {
        path    : dist_dir,
        filename: "index_bundle.js"
    },
    module : {
        // NB: Before Webpack 2, "rules" was called "modules".
        rules: [
            {test: /\.js$/, include: src_dir, loader: "babel-loader"},
            {test: /\.css$/, include: src_dir, use: ['style-loader', 'css-loader']}
        ]
    },
    plugins: [
        // This will clean (delete) the destination directory before the build
        new CleanWebpackPlugin(['client/dist']),
        // This will inject the necessary <script> tag, with a link to the bundle, into the index.html file
        new HtmlWebpackPlugin({
                                  template: path.resolve(src_dir, 'index.html'),
                                  filename: 'index.html',
                                  inject  : 'body'
                              }),

        // Comment out to include moment locales, uncomment to exclude them.
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

        // Very useful to profile the size of included modules:
        // new BundleAnalyzerPlugin(),
    ],
};
