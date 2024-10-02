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

import { V1Pod } from '@kubernetes/client-node';
import { UnknownAction } from 'redux';

import { getNewerResourceVersion } from '@/services/helpers/resourceVersion';
import {
  podDeleteAction,
  podListErrorAction,
  podListReceiveAction,
  podListRequestAction,
  podModifyAction,
  podReceiveAction,
} from '@/store/Pods/actions';
import isSamePod from '@/store/Pods/isSamePod';
import { reducer, State, unloadedState } from '@/store/Pods/reducer';

jest.mock('@/services/helpers/resourceVersion');
jest.mock('@/store/Pods/isSamePod');

describe('Pods reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
    jest.clearAllMocks();
  });

  it('should handle podListRequestAction', () => {
    const action = podListRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
      error: undefined,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle podListReceiveAction', () => {
    const pods = [{ metadata: { name: 'pod1' } }] as V1Pod[];
    const resourceVersion = '12345';
    (getNewerResourceVersion as jest.Mock).mockReturnValue(resourceVersion);
    const action = podListReceiveAction({ pods, resourceVersion });
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      pods,
      resourceVersion,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle podListErrorAction', () => {
    const error = 'Error message';
    const action = podListErrorAction(error);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle podReceiveAction', () => {
    const pod = { metadata: { name: 'pod1', resourceVersion: '12345' } } as V1Pod;
    (getNewerResourceVersion as jest.Mock).mockReturnValue('12345');
    const action = podReceiveAction(pod);
    const expectedState: State = {
      ...initialState,
      pods: [pod],
      resourceVersion: '12345',
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle podModifyAction', () => {
    const initialStateWithPods: State = {
      ...initialState,
      pods: [{ metadata: { name: 'pod1' } }, { metadata: { name: 'pod2' } }] as V1Pod[],
    };
    const modifiedPod = { metadata: { name: 'pod1', resourceVersion: '12345' } } as V1Pod;
    (isSamePod as jest.Mock).mockReturnValueOnce(true).mockReturnValue(false);
    (getNewerResourceVersion as jest.Mock).mockReturnValue('12345');
    const action = podModifyAction(modifiedPod);
    const expectedState: State = {
      ...initialStateWithPods,
      pods: [modifiedPod, initialStateWithPods.pods[1]],
      resourceVersion: '12345',
    };

    expect(reducer(initialStateWithPods, action)).toEqual(expectedState);
  });

  it('should handle podDeleteAction', () => {
    const initialStateWithPods: State = {
      ...initialState,
      pods: [{ metadata: { name: 'pod1' } }] as V1Pod[],
    };
    const podToDelete = { metadata: { name: 'pod1', resourceVersion: '12345' } } as V1Pod;
    (isSamePod as jest.Mock).mockReturnValue(true);
    (getNewerResourceVersion as jest.Mock).mockReturnValue('12345');
    const action = podDeleteAction(podToDelete);
    const expectedState: State = {
      ...initialStateWithPods,
      pods: [],
      resourceVersion: '12345',
    };

    expect(reducer(initialStateWithPods, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    expect(reducer(initialState, unknownAction)).toEqual(initialState);
  });
});
