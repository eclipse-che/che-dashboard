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
  selectDeviceAuthTokenError,
  selectDeviceAuthTokenIsLoading,
  selectDeviceAuthTokens,
} from '@/store/DeviceAuthToken/selectors';

describe('DeviceAuthToken, selectors', () => {
  const mockState = {
    deviceAuthToken: {
      isLoading: true,
      tokens: [
        { name: 'device-authentication-secret-abc12' },
        { name: 'device-authentication-secret-xyz34' },
      ],
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select isLoading', () => {
    expect(selectDeviceAuthTokenIsLoading(mockState)).toBe(true);
  });

  it('should select tokens', () => {
    expect(selectDeviceAuthTokens(mockState)).toEqual([
      { name: 'device-authentication-secret-abc12' },
      { name: 'device-authentication-secret-xyz34' },
    ]);
  });

  it('should select error', () => {
    expect(selectDeviceAuthTokenError(mockState)).toBe('Something went wrong');
  });
});
