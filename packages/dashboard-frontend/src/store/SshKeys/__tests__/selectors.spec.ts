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
  selectSshKeys,
  selectSshKeysError,
  selectSshKeysIsLoading,
} from '@/store/SshKeys/selectors';

describe('SshKeys, selectors', () => {
  const mockState = {
    sshKeys: {
      isLoading: true,
      keys: [{ name: 'key1' }, { name: 'key2' }],
      error: 'Something went wrong',
    },
  } as RootState;

  it('should select isLoading', () => {
    const result = selectSshKeysIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should select ssh keys', () => {
    const result = selectSshKeys(mockState);
    expect(result).toEqual([{ name: 'key1' }, { name: 'key2' }]);
  });

  it('should select ssh keys error', () => {
    const result = selectSshKeysError(mockState);
    expect(result).toEqual('Something went wrong');
  });
});
