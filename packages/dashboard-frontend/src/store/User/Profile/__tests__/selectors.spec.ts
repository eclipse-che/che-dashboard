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
  selectUserProfile,
  selectUserProfileError,
  selectUserProfileState,
} from '@/store/User/Profile/selectors';

describe('UserProfile Selectors', () => {
  const mockState = {
    userProfile: {
      userProfile: {
        email: 'test@example.com',
        username: 'testuser',
      },
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select the user profile state', () => {
    const result = selectUserProfileState(mockState);
    expect(result).toEqual(mockState.userProfile);
  });

  it('should select the user profile', () => {
    const result = selectUserProfile(mockState);
    expect(result).toEqual({
      email: 'test@example.com',
      username: 'testuser',
    });
  });

  it('should select the user profile error', () => {
    const result = selectUserProfileError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
