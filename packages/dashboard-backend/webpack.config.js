/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

const path = require('path');
const webpack = require('webpack');

const config = {
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
        extensions: ['.ts', '.js'],
    },
    resolveLoader: {},
    plugins: [
        new webpack.ProgressPlugin(),
    ],
    target: 'node',
    node: {
      __dirname: false,
    },
    output: {
        filename: 'server.js',
        library: 'dashboard-backend-client',
        libraryTarget: 'umd',
        globalObject: 'this',
        path: path.resolve(__dirname, 'lib')
    },
};

module.exports = (env = {}) => {
  return config;
};
