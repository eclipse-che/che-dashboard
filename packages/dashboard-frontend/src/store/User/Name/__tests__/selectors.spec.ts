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
  selectUsername,
  selectUsernameError,
  selectUsernameState,
} from '@/store/User/Name/selectors';

describe('Username Selectors', () => {
  const mockState = {
    username: {
      username: 'testuser',
      error: 'Something went wrong',
      isLoading: false,
    },
  } as RootState;

  it('should select the user profile state', () => {
    const result = selectUsernameState(mockState);
    expect(result).toEqual(mockState.username);
  });

  it('should select the username', () => {
    const result = selectUsername(mockState);
    expect(result).toEqual('testuser');
  });

  it('should select the user profile error', () => {
    const result = selectUsernameError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
