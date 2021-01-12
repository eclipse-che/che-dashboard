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

import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';
import * as Plugins from './Plugins';
import * as FactoryResolver from './FactoryResolver';
import * as WorkspacesStore from './Workspaces';
import * as DevfileRegistriesStore from './DevfileRegistries';
import * as InfrastructureNamespaceStore from './InfrastructureNamespace';
import * as BrandingStore from './Branding';
import userReducer, { UserState } from './User';

// the top-level state object
export interface AppState {
  branding: BrandingStore.State;
  devfileRegistries: DevfileRegistriesStore.State;
  infrastructureNamespace: InfrastructureNamespaceStore.State;
  user: UserState;
  workspaces: WorkspacesStore.State;
  plugins: Plugins.State;
  factoryResolver: FactoryResolver.State;
}

export const reducers = {
  workspaces: WorkspacesStore.reducer,
  devfileRegistries: DevfileRegistriesStore.reducer,
  branding: BrandingStore.reducer,
  user: userReducer,
  infrastructureNamespace: InfrastructureNamespaceStore.reducer,
  plugins: Plugins.reducer,
  factoryResolver: FactoryResolver.reducer,
};

// this type can be used as a hint on action creators so that its 'dispatch' and 'getState' params are
// correctly typed to match your store.
/**
 * @deprecated
 */
export interface AppThunkAction<TAction> {
  (dispatch: (action: TAction) => void, getState: () => AppState): void;
}
export type AppThunk<ActionType extends Action, ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  ActionType
>;
