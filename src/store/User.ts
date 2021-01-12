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

// This state defines the type of data maintained in the Redux store.

export interface UserState {
  user: che.User | undefined;
  isLogged: boolean;
}

export interface UserAction extends UserState {
  type: string;
}

export const actionCreators = {

};

export const setUser = (user: che.User): UserAction => {
  return {
    type: 'SET_USER',
    user: user,
    isLogged: true
  };
};

const unloadedState: UserState = {
  user: undefined,
  isLogged: false,
};

const userReducer = (state: UserState | undefined, action: UserAction): UserState => {
  if (state === undefined) {
    return unloadedState;
  }

  switch (action.type) {
    case 'SET_USER':
      return { user: action.user, isLogged: true };
  }

  return state;
};

export default userReducer;
