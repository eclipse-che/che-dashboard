const path = require('path');
const webpack = require('webpack');
const PnpPlugin = require('pnp-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    entry: path.join(__dirname, 'src/index.ts'),
    mode: 'production',
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
    node: {
      __dirname: false,
    },
    externals: [nodeExternals()],
    output: {
        filename: 'server.js',
        path: path.join(__dirname, 'lib')
    },
};
