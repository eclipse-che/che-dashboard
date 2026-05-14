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
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const config = {
  entry: {
    client: path.join(__dirname, 'src/index.tsx'),
    'service-worker': path.join(__dirname, 'src/service-worker.ts'),
    'accept-factory-link': path.join(__dirname, 'src/preload/index.ts'),
    'branding-loader': path.join(__dirname, 'src/preload/brandingLoader.ts'),
  },
  output: {
    path: path.join(__dirname, 'lib', 'public/dashboard'),
    publicPath: './',
    filename: (pathData) => {
      if (pathData.chunk.name === 'accept-factory-link') {
        return 'static/preload/[name].js';
      }
      if (pathData.chunk.name === 'service-worker') {
        return '[name].js';
      }
      if (pathData.chunk.name === 'branding-loader') {
        return 'static/preload/[name].js';
      }
      return '[name].[fullhash:8].js';
    },
    chunkFilename: '[name].[chunkhash].js',
    globalObject: 'this',
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: (chunk) => {
        // exclude preload chunks from being split (they should be standalone)
        return (
          chunk.name !== 'accept-factory-link' &&
          chunk.name !== 'branding-loader'
        );
      },
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      minChunks: 1,
      cacheGroups: {
        vendors: {
          name: 'vendors',
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        common: {
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.join(__dirname, 'src'),
        use: [{
          loader: 'ts-loader',
          options: {
            // TS6059: file is not under 'rootDir'. Plugin files are mounted via
            // symlinks outside the dashboard src tree, so TypeScript raises this
            // error for them. Suppressing it here lets the build succeed while
            // symlink-based plugins are compiled alongside core dashboard code.
            ignoreDiagnostics: [6059],
          },
        }],
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
    ]
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    symlinks: false,
    alias: (() => {
      // IMPORTANT: webpack alias resolution uses first-match-wins (forEachBail).
      // Specific plugin aliases MUST be listed BEFORE the general '@' alias,
      // otherwise '@' intercepts all '@/...' imports and plugin aliases never fire.
      const pluginsDir = path.join(__dirname, 'src/plugins');
      const pluginAliases = {};

      if (fs.existsSync(pluginsDir)) {
        const pluginDirs = fs.readdirSync(pluginsDir).filter(n => {
          const full = path.join(pluginsDir, n);
          try {
            return (fs.lstatSync(full).isSymbolicLink() || fs.statSync(full).isDirectory())
              && !n.endsWith('.ts') && !n.endsWith('.tsx');
          } catch { return false; }
        });

        for (const pluginName of pluginDirs) {
          const pluginDir = path.resolve(pluginsDir, pluginName);
          pluginAliases[`@/plugins/${pluginName}`] = pluginDir;

          // For components and pages the plugin provides, alias the @/components/<X>
          // and @/pages/<X> paths to the plugin dir when not present in dashboard src.
          for (const subdir of ['components', 'pages']) {
            const pluginSubdir = path.join(pluginDir, subdir);
            if (!fs.existsSync(pluginSubdir)) continue;
            for (const entry of fs.readdirSync(pluginSubdir)) {
              const dashboardPath = path.join(__dirname, 'src', subdir, entry);
              if (!fs.existsSync(dashboardPath)) {
                pluginAliases[`@/${subdir}/${entry}`] = path.resolve(pluginSubdir, entry);
              }
            }
          }
        }
      }

      return {
        // Specific plugin aliases come FIRST so they win over the general '@' alias
        ...pluginAliases,
        // General '@' alias for absolute imports (see tsconfig.json) — must be LAST
        '@': path.resolve(__dirname, 'src/'),
      };
    })(),
    fallback: {
      "fs": false,
      "net": false,
      "module": false,
      "path": false,
      "os": false,
      "process/browser": false,
      "crypto": require.resolve('crypto-browserify'),
      "stream": false,
    },
  },
  resolveLoader: {},
  node: { global: true },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      'process.env.DASHBOARD_VERSION': JSON.stringify(require('./package.json').version),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './index.html'),
      chunks : ['client', 'service-worker'],
      filename: 'index.html',
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/preload/index.html'),
      chunks : ['accept-factory-link'],
      filename: '../index.html',
      publicPath: '/dashboard/',
    }),
    new CopyPlugin({
      patterns: [
        { from: path.join(__dirname, 'assets'), to: 'assets' },
        { from: path.join(__dirname, 'static'), to: 'static' },
      ]
    }),
  ],
};

module.exports = (env = {}) => {
  return config;
};
