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
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const config = {
  entry: path.join(__dirname, 'src/index.ts'),
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  resolveLoader: {},
  plugins: [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin(),
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
    path: path.join(__dirname, 'lib')
  },
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000,
  },
};

module.exports = (env = {}) => {
  return config;
};
