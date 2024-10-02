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

import { V230DevfileComponents } from '@devfile/api';
import { api } from '@eclipse-che/common';
import { UnknownAction } from 'redux';

import {
  serverConfigErrorAction,
  serverConfigReceiveAction,
  serverConfigRequestAction,
} from '@/store/ServerConfig/actions';
import { reducer, State, unloadedState } from '@/store/ServerConfig/reducer';

describe('ServerConfig, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle serverConfigRequestAction', () => {
    const action = serverConfigRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle serverConfigReceiveAction', () => {
    const config = {
      containerBuild: {},
      defaults: {
        editor: 'editor',
        components: [
          {
            name: 'component1',
          },
        ] as V230DevfileComponents[],
        plugins: [
          {
            plugins: ['plugin1'],
          },
        ] as api.IWorkspacesDefaultPlugins[],
        pvcStrategy: 'strategy',
      },
      devfileRegistry: {
        disableInternalRegistry: true,
        externalDevfileRegistries: [],
      },
      pluginRegistry: {
        openVSXURL: 'url',
      },
      timeouts: {
        inactivityTimeout: 100,
        runTimeout: 200,
        startTimeout: 300,
      },
      defaultNamespace: {
        autoProvision: false,
      },
      cheNamespace: 'namespace',
      pluginRegistryURL: 'pluginURL',
      pluginRegistryInternalURL: 'internalURL',
      allowedSourceUrls: ['url1'],
    } as api.IServerConfig;
    const action = serverConfigReceiveAction(config);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      config,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle serverConfigErrorAction', () => {
    const error = 'Error message';
    const action = serverConfigErrorAction(error);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
