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

import oauth2Plugin, { OAuth2Namespace } from '@fastify/oauth2';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    localStart: OAuth2Namespace;
  }
}

const CHE_HOST = 'http://localhost:8080';

export function registerOpenShiftOauth2Plugin(server: FastifyInstance) {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const openShiftOAuthUrl = process.env.OPENSHIFT_OAUTH_URL;

  if (!clientId || !clientSecret || !openShiftOAuthUrl) {
    throw new Error(
      'CLIENT_ID, CLIENT_SECRET and OPENSHIFT_OAUTH_URL must be set for OpenShift OAuth local run',
    );
  }

  server.register(oauth2Plugin, {
    name: 'localStart',
    credentials: {
      client: {
        id: clientId,
        secret: clientSecret,
      },
      auth: {
        authorizeHost: openShiftOAuthUrl,
        authorizePath: '/oauth/authorize',
        tokenHost: openShiftOAuthUrl,
        tokenPath: '/oauth/token',
      },
    },
    scope: ['user:full'],
    startRedirectPath: '/oauth/sign_in',
    callbackUri: `${CHE_HOST}/oauth/callback`,
  });
}
