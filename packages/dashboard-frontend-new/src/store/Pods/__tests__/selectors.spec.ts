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
  selectAllPods,
  selectPodsError,
  selectPodsIsLoading,
  selectPodsResourceVersion,
} from '@/store/Pods';

describe('Pods Selectors', () => {
  const mockState = {
    pods: {
      pods: [{ metadata: { name: 'pod1' } }, { metadata: { name: 'pod2' } }],
      error: 'Something went wrong',
      isLoading: true,
      resourceVersion: '12345',
    },
  } as RootState;

  it('should select all pods', () => {
    const result = selectAllPods(mockState);
    expect(result).toEqual([{ metadata: { name: 'pod1' } }, { metadata: { name: 'pod2' } }]);
  });

  it('should select pods error', () => {
    const result = selectPodsError(mockState);
    expect(result).toEqual('Something went wrong');
  });

  it('should select pods isLoading', () => {
    const result = selectPodsIsLoading(mockState);
    expect(result).toBe(true);
  });

  it('should select pods resource version', () => {
    const result = selectPodsResourceVersion(mockState);
    expect(result).toEqual('12345');
  });
});
