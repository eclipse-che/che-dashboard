const path = require('path');
const webpack = require('webpack');
const PnpPlugin = require('pnp-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

var server = {
    entry: path.join(__dirname, 'src/index.ts'),
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                    }
                ],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        plugins: [PnpPlugin],
        extensions: ['.ts', '.js'],
    },
    resolveLoader: {
        plugins: [PnpPlugin.moduleLoader(module)],
    },
    plugins: [
        new webpack.ProgressPlugin(),
    ],
    target: 'node',
    externals: [nodeExternals()],
    output: {
        filename: 'server.js',
        library: 'dashboard-backend',
        libraryTarget: 'umd',
        globalObject: 'this',
        path: path.resolve(__dirname, 'lib')
    },
};


module.exports = [server];
