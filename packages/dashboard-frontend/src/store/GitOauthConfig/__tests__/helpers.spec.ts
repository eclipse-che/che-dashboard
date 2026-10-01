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

import { findOauthTokenSecret } from '@/store/GitOauthConfig/helpers';
import { IGitOauth } from '@/store/GitOauthConfig/reducer';

describe('GitOauthConfig, helpers', () => {
  const gitOauth: IGitOauth = {
    name: 'github',
    endpointUrl: 'https://github.com/',
  };

  const oauthToken: api.PersonalAccessToken = {
    cheUserId: 'test-user',
    gitProvider: 'github',
    gitProviderEndpoint: 'https://github.com',
    tokenData: 'test-token-data',
    tokenName: 'oauth2-token',
    isOauth: true,
  };

  const personalAccessToken: api.PersonalAccessToken = {
    cheUserId: 'test-user',
    gitProvider: 'github',
    gitProviderEndpoint: 'https://github.com',
    tokenData: 'test-token-data',
    tokenName: 'personal-token',
    isOauth: false,
  };

  it('should find the OAuth token ignoring the trailing slash', () => {
    const result = findOauthTokenSecret(gitOauth, [personalAccessToken, oauthToken]);

    expect(result).toEqual(oauthToken);
  });

  it('should ignore personal access tokens', () => {
    const result = findOauthTokenSecret(gitOauth, [personalAccessToken]);

    expect(result).toBeUndefined();
  });

  it('should ignore tokens of other git services', () => {
    const result = findOauthTokenSecret(gitOauth, [
      { ...oauthToken, gitProviderEndpoint: 'https://gitlab.com' },
    ]);

    expect(result).toBeUndefined();
  });
});
