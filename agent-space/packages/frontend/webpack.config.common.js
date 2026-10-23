/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

// The About dialog reports the version of the dashboard Agent Space ships with,
// so it is read from the dashboard's own package rather than from this one.
const DASHBOARD_VERSION = require('../../../packages/dashboard-frontend/package.json').version;

// The bundle is served next to the dashboard assets, at <dashboard-root>/agent-space/.
// Relative asset URLs keep it working under any base path.
const PUBLIC_PATH = './';

// Agent Space is part of the dashboard's single static tree: the backend serves
// packages/dashboard-frontend/lib/public, and the image copies that same folder.
// Building straight into it means one `yarn build` produces one servable artifact,
// with no copy step and no extra Dockerfile layer.
//
// dashboard-frontend cleans this directory on build but is configured to keep
// `agent-space/`, so the two bundles can be built in either order.
const OUTPUT_PATH = path.resolve(
  __dirname,
  '../../../packages/dashboard-frontend/lib/public/dashboard/agent-space',
);

const config = {
  entry: {
    client: path.join(__dirname, 'src/index.tsx'),
  },
  output: {
    path: OUTPUT_PATH,
    publicPath: PUBLIC_PATH,
    filename: '[name].[fullhash:8].js',
    chunkFilename: '[name].[chunkhash].js',
    globalObject: 'this',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.join(__dirname, 'src'),
        use: ['ts-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|ttf|eot|ico)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    alias: {
      // alias for absolute imports (see tsconfig.json)
      '@': path.resolve(__dirname, 'src/'),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.DASHBOARD_VERSION': JSON.stringify(DASHBOARD_VERSION),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './index.html'),
      chunks: ['client'],
      filename: 'index.html',
    }),
    new CopyPlugin({
      patterns: [
        // Runtime configuration, overridable per deployment without a rebuild.
        { from: path.join(__dirname, 'static'), to: '.' },
        // Hardcoded Agent Space samples
        {
          from: path.join(__dirname, '../registry/sandbox'),
          to: 'registry/sandbox',
        },
        // Icons referenced in the sample registry
        {
          from: path.join(__dirname, '../registry/images'),
          to: 'registry/images',
        },
      ],
    }),
  ],
};

module.exports = () => config;
