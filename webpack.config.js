var HtmlWebpackPlugin       = require('html-webpack-plugin');

// This will inject the necessary <script> tag, with a link to the bundle, into the index.html file
var HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
                                                        template: __dirname + '/client/src/index.html',
                                                        filename: 'index.html',
                                                        inject  : 'body'
                                                    });
module.exports              = {
    entry  : [
        './client/src/index.js'
    ],
    output : {
        path    : __dirname + '/client/dist',
        filename: "index_bundle.js"
    },
    module : {
        // NB: Before Webpack 2, "rules" was called "modules".
        rules: [
            {test: /\.js$/, include: __dirname + '/client/src', loader: "babel-loader"}
        ]
    },
    plugins: [HTMLWebpackPluginConfig],
    devtool: 'inline-source-map',
};