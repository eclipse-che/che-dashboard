/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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

module.exports = () => {
  return {
    mode: 'production',
    entry: path.join(__dirname, 'src/index.ts'),
    output: {
      filename: path.join('index.js'),
      path: path.join(__dirname, 'lib'),
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false,
          }
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    devtool: 'source-map',
    resolveLoader: {},
    plugins: [
      new webpack.ProgressPlugin(),
    ],
    node: {
      __dirname: false,
    },
    target: 'node',
  };
};
