/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import { fetchBranding } from '../../services/assets/branding';
import { AppThunk } from '..';
import { merge } from 'lodash';
import { BRANDING_DEFAULT, BrandingData } from '../../services/bootstrap/branding.constant';
import { container } from '../../inversify.config';
import { CheWorkspaceClient } from '../../services/workspace-client/cheWorkspaceClient';
import { getErrorMessage } from '../../services/helpers/getErrorMessage';
import { createState } from '../helpers';

const ASSET_PREFIX = './assets/branding/';

export interface State {
  isLoading: boolean;
  data: BrandingData;
  error?: string;
}

export interface RequestBrandingAction {
  type: 'REQUEST_BRANDING';
}

export interface ReceivedBrandingAction {
  type: 'RECEIVED_BRANDING';
  data: BrandingData;
}

export interface ReceivedBrandingErrorAction {
  type: 'RECEIVED_BRANDING_ERROR';
  error: string;
}

type KnownAction =
  RequestBrandingAction
  | ReceivedBrandingAction
  | ReceivedBrandingErrorAction;

export type ActionCreators = {
  requestBranding: () => AppThunk<KnownAction, Promise<void>>;
};

const cheWorkspaceClient = container.get(CheWorkspaceClient);

export const actionCreators: ActionCreators = {

  requestBranding: (): AppThunk<KnownAction, Promise<void>> =>
    async (dispatch): Promise<void> => {
      const url = `${ASSET_PREFIX}product.json`;

      dispatch({
        type: 'REQUEST_BRANDING',
      });

      try {
        const receivedBranding = await fetchBranding(url);
        const branding = getBrandingData(receivedBranding);
        const productVersion = await cheWorkspaceClient.restApiClient.getApiInfo();

        // Use the products version if specified in product.json, otherwise use the default version given by che server
        branding.productVersion = branding.productVersion ? branding.productVersion : productVersion['implementationVersion'];

        dispatch({
          type: 'RECEIVED_BRANDING',
          data: branding,
        });
      } catch (e) {
        const errorMessage = `Failed to fetch branding data by URL: "${url}", reason: ` + getErrorMessage(e);
        dispatch({
          type: 'RECEIVED_BRANDING_ERROR',
          error: errorMessage,
        });
        throw errorMessage;
      }
    },

};

const unloadedState: State = {
  isLoading: false,
  data: getBrandingData(),
};

export const reducer: Reducer<State> = (state: State | undefined, incomingAction: Action): State => {
  if (state === undefined) {
    return unloadedState;
  }

  const action = incomingAction as KnownAction;
  switch (action.type) {
    case 'REQUEST_BRANDING':
      return createState(state, {
        isLoading: true,
        error: undefined,
      });
    case 'RECEIVED_BRANDING':
      return createState(state, {
        isLoading: false,
        data: action.data,
      });
    case 'RECEIVED_BRANDING_ERROR':
      return createState(state, {
        isLoading: false,
        error: action.error,
      });
    default:
      return state;
  }
};

function getBrandingData(receivedBranding?: { [key: string]: any }): BrandingData {
  let branding: BrandingData = Object.assign({}, BRANDING_DEFAULT);

  if (receivedBranding && Object.keys(receivedBranding).length > 0) {
    branding = merge(branding, receivedBranding);
  }
  // resolve asset paths
  const assetTitles: Array<keyof BrandingData> = ['logoFile', 'logoTextFile'];
  assetTitles.forEach((asset: string) => {
    const path = branding[asset] as string;
    if (path.startsWith(ASSET_PREFIX)) {
      return;
    }
    branding[asset] = ASSET_PREFIX + branding[asset];
  });

  return branding;
}
