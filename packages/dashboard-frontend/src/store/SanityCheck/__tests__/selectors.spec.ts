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

import { RootState } from '@/store';
import { selectAsyncIsAuthorized, selectSanityCheckError } from '@/store/SanityCheck/selectors';

describe('SanityCheck Selectors', () => {
  const mockState = {
    sanityCheck: {
      authorized: true,
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select async isAuthorized', async () => {
    const result = await selectAsyncIsAuthorized(mockState);
    expect(result).toBe(true);
  });

  it('should return false if an error occurs in selectAsyncIsAuthorized', async () => {
    const mockStateWithError = {
      sanityCheck: {
        authorized: false,
      },
    } as RootState;

    await expect(selectAsyncIsAuthorized(mockStateWithError)).resolves.toEqual(false);
  });

  it('should select sanity check error', () => {
    const result = selectSanityCheckError(mockState);
    expect(result).toBe('Something went wrong');
  });

  it('should return an empty string if error is not set', () => {
    const stateWithoutError = {
      ...mockState,
      sanityCheck: { ...mockState.sanityCheck, error: undefined },
    } as RootState;
    const result = selectSanityCheckError(stateWithoutError);
    expect(result).toBe('');
  });
});
