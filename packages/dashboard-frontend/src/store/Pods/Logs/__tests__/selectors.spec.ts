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
import { selectAllLogs, selectPodLogs } from '@/store/Pods/Logs/selectors';

describe('Pods Logs, selectors', () => {
  const mockState = {
    logs: {
      logs: {
        pod1: {
          containers: {
            container1: {
              logs: 'log message 1',
              failure: false,
            },
            container2: {
              logs: 'log message 2',
              failure: true,
            },
          },
        },
        pod2: {
          containers: {
            container1: {
              logs: 'log message 3',
              failure: false,
            },
          },
        },
      },
    },
  } as Partial<RootState> as RootState;

  it('should select all logs', () => {
    const result = selectAllLogs(mockState);
    expect(result).toEqual(mockState.logs.logs);
  });

  it('should select pod logs for a specific pod', () => {
    const selectLogsForPod = selectPodLogs(mockState);
    const result = selectLogsForPod('pod1');
    expect(result).toEqual(mockState.logs.logs.pod1?.containers);
  });

  it('should return undefined if pod name is undefined', () => {
    const selectLogsForPod = selectPodLogs(mockState);
    const result = selectLogsForPod(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined if pod does not exist', () => {
    const selectLogsForPod = selectPodLogs(mockState);
    const result = selectLogsForPod('nonexistent-pod');
    expect(result).toBeUndefined();
  });
});
