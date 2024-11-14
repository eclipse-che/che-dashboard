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
import {
  selectCheUserId,
  selectCheUserIdError,
  selectCheUserIsLoading,
} from '@/store/User/Id/selectors';

describe('CheUserId, selectors', () => {
  const mockState = {
    userId: {
      isLoading: true,
      cheUserId: 'test-user-id',
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select isLoading', () => {
    const result = selectCheUserIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should select cheUserId', () => {
    const result = selectCheUserId(mockState);
    expect(result).toEqual('test-user-id');
  });

  it('should select cheUserId error', () => {
    const result = selectCheUserIdError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
