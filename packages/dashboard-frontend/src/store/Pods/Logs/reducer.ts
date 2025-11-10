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

import { createReducer } from '@reduxjs/toolkit';

import { podLogsDeleteAction, podLogsReceiveAction } from '@/store/Pods/Logs/actions';

export type ContainerLogs = {
  logs: string;
  failure: boolean;
};

export interface State {
  logs: {
    [podName: string]:
      | {
          containers: {
            [containerName: string]: ContainerLogs | undefined;
          };
          error?: string;
        }
      | undefined;
  };
}

export const unloadedState: State = {
  logs: {},
};

export const reducer = createReducer(unloadedState, builder =>
  builder
    .addCase(podLogsReceiveAction, (state, action) => {
      const _pod = state.logs[action.payload.podName];
      const _containers = _pod?.containers;
      const _containerLogs = _containers?.[action.payload.containerName];
      const _logs = action.payload.failure === _containerLogs?.failure ? _containerLogs.logs : '';

      state.logs[action.payload.podName] = {
        error: undefined,
        containers: {
          ..._containers,
          [action.payload.containerName]: {
            logs: _logs + action.payload.logs,
            failure: action.payload.failure,
          },
        },
      };
    })
    .addCase(podLogsDeleteAction, (state, action) => {
      delete state.logs[action.payload];
    })
    .addDefaultCase(state => state),
);
