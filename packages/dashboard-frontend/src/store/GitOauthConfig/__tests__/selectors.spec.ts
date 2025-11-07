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

import { RootState } from '@/store';
import {
  selectError,
  selectGitOauth,
  selectIsLoading,
  selectProvidersWithToken,
  selectSkipOauthProviders,
} from '@/store/GitOauthConfig/selectors';

describe('GitOauthConfig, selectors', () => {
  const mockState = {
    gitOauthConfig: {
      isLoading: true,
      gitOauth: [{ name: 'github', endpointUrl: 'https://github.com' }],
      providersWithToken: ['github'],
      skipOauthProviders: ['gitlab'],
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select isLoading', () => {
    const result = selectIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should select gitOauth', () => {
    const result = selectGitOauth(mockState);
    expect(result).toEqual([{ name: 'github', endpointUrl: 'https://github.com' }]);
  });

  it('should select providersWithToken', () => {
    const result = selectProvidersWithToken(mockState);
    expect(result).toEqual(['github']);
  });

  it('should select skipOauthProviders', () => {
    const result = selectSkipOauthProviders(mockState);
    expect(result).toEqual(['gitlab']);
  });

  it('should select error', () => {
    const result = selectError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
