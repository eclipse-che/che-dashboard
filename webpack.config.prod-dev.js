/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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

module.exports = env => {
  const proxyTarget = env && env.server ? env.server : 'https://che.openshift.io/';

  return {
    entry: path.join(__dirname, 'build/client.js'),
    devServer: {
      contentBase: [
        path.join(__dirname, 'build'),
      ],
      clientLogLevel: 'debug',
      contentBasePublicPath: '/',
      disableHostCheck: true,
      host: 'localhost',
      open: false,
      port: 3000,
      stats: 'normal',
      proxy: {
        '/api/websocket': {
          target: proxyTarget,
          ws: true,
          secure: false,
          changeOrigin: true,
          headers: {
            origin: proxyTarget
          }
        },
        '/api': {
          target: proxyTarget,
          secure: false,
          changeOrigin: true,
          headers: {
            origin: proxyTarget
          },
        },
        '/workspace-loader': {
          target: proxyTarget,
          secure: false,
          changeOrigin: true,
          headers: {
            origin: proxyTarget
          }
        },
      },
    }
  };
};
