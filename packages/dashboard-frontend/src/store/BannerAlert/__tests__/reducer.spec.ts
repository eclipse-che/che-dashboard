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

import { bannerAddAction, bannerRemoveAction } from '@/store/BannerAlert/actions';
import { reducer, State, unloadedState } from '@/store/BannerAlert/reducer';

describe('BannerAlert, reducer', () => {
  let initialState: State;

  beforeEach(() => {
    initialState = { ...unloadedState };
  });

  it('should handle bannerAddAction', () => {
    const message = 'Test banner message';
    const action = bannerAddAction(message);
    const expectedState: State = {
      messages: [message],
    };

    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle bannerRemoveAction', () => {
    const message = 'Test banner message';
    const stateWithMessage: State = {
      messages: [message],
    };
    const action = bannerRemoveAction(message);
    const expectedState: State = {
      messages: [],
    };

    expect(reducer(stateWithMessage, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' };
    const currentState: State = {
      messages: ['Existing message'],
    };

    expect(reducer(currentState, unknownAction)).toEqual(currentState);
  });
});
