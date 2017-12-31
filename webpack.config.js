var HtmlWebpackPlugin       = require('html-webpack-plugin');
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
        loaders: [
            {test: /\.js$/, include: __dirname + '/client/src', loader: "babel-loader"}
        ]
    },
    plugins: [HTMLWebpackPluginConfig],
    devtool: 'inline-source-map',
};