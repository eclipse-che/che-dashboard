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

import devfileApi from '@/services/devfileApi';
import { che } from '@/services/models';
import {
  devfileReceiveAction,
  devfileRequestAction,
  filterClearAction,
  filterSetAction,
  languagesFilterClearAction,
  languagesFilterSetAction,
  registryMetadataErrorAction,
  registryMetadataReceiveAction,
  registryMetadataRequestAction,
  resourcesErrorAction,
  resourcesReceiveAction,
  resourcesRequestAction,
  tagsFilterClearAction,
  tagsFilterSetAction,
} from '@/store/DevfileRegistries/actions';
import { reducer, State, unloadedState } from '@/store/DevfileRegistries/reducer';

describe('DevfileRegistries, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle registryMetadataRequestAction', () => {
    const action = registryMetadataRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle registryMetadataReceiveAction', () => {
    const metadata = [{ displayName: 'devfile1' }] as che.DevfileMetaData[];
    const action = registryMetadataReceiveAction({ url: 'url1', metadata });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      registries: {
        url1: { metadata },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle registryMetadataErrorAction', () => {
    const action = registryMetadataErrorAction({ url: 'url1', error: 'Error message' });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      registries: {
        url1: { error: 'Error message', metadata: [] },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle devfileRequestAction', () => {
    const action = devfileRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle devfileReceiveAction', () => {
    const action = devfileReceiveAction({ url: 'url1', devfile: 'devfile content' });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      devfiles: {
        url1: { content: 'devfile content' },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle resourcesRequestAction', () => {
    const action = resourcesRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle resourcesReceiveAction', () => {
    const devWorkspace = { kind: 'DevWorkspace', metadata: { name: 'workspace1' } };
    const devWorkspaceTemplate = { kind: 'DevWorkspaceTemplate', metadata: { name: 'template1' } };
    const action = resourcesReceiveAction({
      url: 'url1',
      devWorkspace: devWorkspace as devfileApi.DevWorkspace,
      devWorkspaceTemplate: devWorkspaceTemplate as devfileApi.DevWorkspaceTemplate,
    });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      devWorkspaceResources: {
        url1: {
          resources: [
            devWorkspace as devfileApi.DevWorkspace,
            devWorkspaceTemplate as devfileApi.DevWorkspaceTemplate,
          ],
        },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle resourcesErrorAction', () => {
    const action = resourcesErrorAction({ url: 'url1', error: 'Error message' });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      devWorkspaceResources: {
        url1: { error: 'Error message' },
      },
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle filterSetAction', () => {
    const action = filterSetAction('new filter');
    const expectedState: State = {
      ...initialState,
      filter: 'new filter',
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle filterClearAction', () => {
    const stateWithFilter: State = {
      ...initialState,
      filter: 'some filter',
    };
    const action = filterClearAction();
    const expectedState: State = {
      ...initialState,
      filter: '',
    };

    expect(reducer(stateWithFilter, action)).toEqual(expectedState);
  });

  it('should handle tagsFilterSetAction', () => {
    const action = tagsFilterSetAction(['new filter']);
    const expectedState: State = {
      ...initialState,
      tagsFilter: ['new filter'],
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle tagsFilterClearAction', () => {
    const stateWithFilter: State = {
      ...initialState,
      tagsFilter: ['some filter'],
    };
    const action = tagsFilterClearAction();
    const expectedState: State = {
      ...initialState,
      tagsFilter: [],
    };

    expect(reducer(stateWithFilter, action)).toEqual(expectedState);
  });

  it('should handle languagesFilterSetAction', () => {
    const action = languagesFilterSetAction(['new filter']);
    const expectedState: State = {
      ...initialState,
      languagesFilter: ['new filter'],
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle languagesFilterClearAction', () => {
    const stateWithFilter: State = {
      ...initialState,
      languagesFilter: ['some filter'],
    };
    const action = languagesFilterClearAction();
    const expectedState: State = {
      ...initialState,
      languagesFilter: [],
    };

    expect(reducer(stateWithFilter, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
