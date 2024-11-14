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

import { BRANDING_DEFAULT, BrandingData } from '@/services/bootstrap/branding.constant';
import {
  brandingErrorAction,
  brandingReceiveAction,
  brandingRequestAction,
} from '@/store/Branding/actions';
import { reducer, State, unloadedState } from '@/store/Branding/reducer';

describe('Branding, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle brandingRequestAction', () => {
    const action = brandingRequestAction();
    const expectedState: State = {
      ...initialState,
      isLoading: true,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle brandingReceiveAction', () => {
    const brandingData: BrandingData = { ...BRANDING_DEFAULT, productVersion: '1.0.0' };
    const action = brandingReceiveAction(brandingData);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      data: brandingData,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle brandingErrorAction', () => {
    const error = 'Failed to fetch branding data';
    const action = brandingErrorAction(error);
    const expectedState: State = {
      ...initialState,
      isLoading: false,
      error,
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as UnknownAction;
    const currentState = { ...initialState };

    expect(reducer(currentState, unknownAction)).toEqual(currentState);
  });
});
