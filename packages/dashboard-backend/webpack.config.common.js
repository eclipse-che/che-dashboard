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
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env = {}) => {
  const enableSwagger = env.enableSwagger || process.env.ENABLE_SWAGGER;
  return {
    entry: path.join(__dirname, 'src/index.ts'),
    output: {
      filename: path.join('server', 'backend.js'),
      path: path.join(__dirname, 'lib')
    },
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
      new CopyPlugin({
        patterns: [
          { from: path.resolve('..', '..', 'node_modules', 'fastify-swagger', 'static'), to: 'static' },
        ]
      }),
    ],
    target: 'node',
    node: {
      __dirname: false,
    },
  };

};
