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
import { selectError, selectIsLoading, selectRegistries } from '@/store/DockerConfig/selectors';

describe('DockerConfig Selectors', () => {
  const mockState = {
    dockerConfig: {
      isLoading: true,
      registries: [
        { url: 'https://registry1.com', username: 'user1', password: 'pass1' },
        { url: 'https://registry2.com', username: 'user2', password: 'pass2' },
      ],
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select isLoading', () => {
    const result = selectIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should select registries', () => {
    const result = selectRegistries(mockState);
    expect(result).toEqual([
      { url: 'https://registry1.com', username: 'user1', password: 'pass1' },
      { url: 'https://registry2.com', username: 'user2', password: 'pass2' },
    ]);
  });

  it('should select error', () => {
    const result = selectError(mockState);
    expect(result).toEqual('Something went wrong');
  });

  it('should return undefined if error is not set', () => {
    const stateWithoutError = {
      ...mockState,
      dockerConfig: { ...mockState.dockerConfig, error: undefined },
    } as RootState;
    const result = selectError(stateWithoutError);
    expect(result).toBeUndefined();
  });
});
