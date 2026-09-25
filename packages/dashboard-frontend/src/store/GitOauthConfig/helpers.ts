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

import { api } from '@eclipse-che/common';

import { IGitOauth } from '@/store/GitOauthConfig/reducer';

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

/**
 * Returns the OAuth token stored in a Kubernetes Secret for the given Git service, if any.
 */
export function findOauthTokenSecret(
  gitOauth: IGitOauth,
  tokens: api.PersonalAccessToken[],
): api.PersonalAccessToken | undefined {
  const gitOauthEndpoint = normalizeEndpoint(gitOauth.endpointUrl);

  // compare Git OAuth Endpoint url ONLY with OAuth tokens
  return tokens.find(
    token => token.isOauth && normalizeEndpoint(token.gitProviderEndpoint) === gitOauthEndpoint,
  );
}
