/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Action, Reducer } from 'redux';
import { AppThunk } from '..';

export interface State {
  development: boolean;
}

interface SetDevelopmentModeAction {
  type: 'SET_MODE';
  development: boolean;
}

export type ActionCreators = {
  defineEnvironmentMode: () => AppThunk<SetDevelopmentModeAction, void>;
}

export const actionCreators: ActionCreators = {

  defineEnvironmentMode: (): AppThunk<SetDevelopmentModeAction, void> => (dispatch): void => {
    try {
      dispatch({
        type: 'SET_MODE',
        development: isDevelopment(),
      });
    } catch (e) {
      // noop
    }
  }

};

const unloadedState: State = {
  development: false,
};

export const reducer: Reducer<State> = (state: State | undefined, incomingAction: Action): State => {
  if (state === undefined) {
    return unloadedState;
  }

  const action = incomingAction as SetDevelopmentModeAction;
  if (action.type === 'SET_MODE') {
    return Object.assign({}, state, {
      development: action.development,
    });
  }
  return state;

};

export function isDevelopment(): boolean {
  try {
    return process.env.ENVIRONMENT === 'development';
  } catch (e) {
    return false;
  }
}
