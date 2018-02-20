/*
 * Copyright (c) 2016-2018 Tom Keffer <tkeffer@gmail.com>
 *
 * See the file LICENSE for your full rights.
 */

/*
 * The default Webpack configuration is the development configuration.
 */

const merge  = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {devtool: 'inline-source-map'});