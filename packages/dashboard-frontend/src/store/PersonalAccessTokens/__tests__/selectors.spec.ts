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
  selectPersonalAccessTokens,
  selectPersonalAccessTokensError,
  selectPersonalAccessTokensIsLoading,
} from '@/store/PersonalAccessTokens/selectors';

describe('PersonalAccessTokens, selectors', () => {
  const mockState = {
    personalAccessToken: {
      isLoading: true,
      tokens: [{ tokenName: 'token1' }, { tokenName: 'token2' }],
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select isLoading', () => {
    const result = selectPersonalAccessTokensIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should select personal access tokens', () => {
    const result = selectPersonalAccessTokens(mockState);
    expect(result).toEqual([{ tokenName: 'token1' }, { tokenName: 'token2' }]);
  });

  it('should select error', () => {
    const result = selectPersonalAccessTokensError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
