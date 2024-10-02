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

import { UnknownAction } from 'redux';

import { podLogsDeleteAction, podLogsReceiveAction } from '@/store/Pods/Logs/actions';
import { reducer, State, unloadedState } from '@/store/Pods/Logs/reducer';

describe('Pods Logs, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle podLogsReceiveAction', () => {
    const action = podLogsReceiveAction({
      podName: 'pod1',
      containerName: 'container1',
      logs: 'log message',
      failure: false,
    });
    const expectedState: State = {
      logs: {
        pod1: {
          containers: {
            container1: {
              logs: 'log message',
              failure: false,
            },
          },
          error: undefined,
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should append logs if failure status is the same', () => {
    const initialStateWithLogs: State = {
      logs: {
        pod1: {
          containers: {
            container1: {
              logs: 'previous log message',
              failure: false,
            },
          },
          error: undefined,
        },
      },
    };
    const action = podLogsReceiveAction({
      podName: 'pod1',
      containerName: 'container1',
      logs: ' new log message',
      failure: false,
    });
    const expectedState: State = {
      logs: {
        pod1: {
          containers: {
            container1: {
              logs: 'previous log message new log message',
              failure: false,
            },
          },
          error: undefined,
        },
      },
    };

    expect(reducer(initialStateWithLogs, action)).toEqual(expectedState);
  });

  it('should replace logs if failure status is different', () => {
    const initialStateWithLogs: State = {
      logs: {
        pod1: {
          containers: {
            container1: {
              logs: 'previous log message',
              failure: false,
            },
          },
          error: undefined,
        },
      },
    };
    const action = podLogsReceiveAction({
      podName: 'pod1',
      containerName: 'container1',
      logs: ' new log message',
      failure: true,
    });
    const expectedState: State = {
      logs: {
        pod1: {
          containers: {
            container1: {
              logs: ' new log message',
              failure: true,
            },
          },
          error: undefined,
        },
      },
    };

    expect(reducer(initialStateWithLogs, action)).toEqual(expectedState);
  });

  it('should handle podLogsDeleteAction', () => {
    const initialStateWithLogs: State = {
      logs: {
        pod1: {
          containers: {
            container1: {
              logs: 'log message',
              failure: false,
            },
          },
          error: undefined,
        },
      },
    };
    const action = podLogsDeleteAction('pod1');
    const expectedState: State = {
      logs: {},
    };

    expect(reducer(initialStateWithLogs, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
