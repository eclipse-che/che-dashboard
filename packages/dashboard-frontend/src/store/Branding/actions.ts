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

import common from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';
import merge from 'lodash/merge';

import { fetchApiInfo, fetchBranding } from '@/services/assets/branding';
import { BRANDING_DEFAULT, BrandingData } from '@/services/bootstrap/branding.constant';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

export const ASSET_PREFIX = './assets/branding/';

export const brandingRequestAction = createAction('branding/request');
export const brandingReceiveAction = createAction<BrandingData>('branding/receive');
export const brandingErrorAction = createAction<string>('branding/error');

export const actionCreators = {
  requestBranding:
    (): AppThunk<Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      const url = `${ASSET_PREFIX}product.json`;

      let branding: BrandingData;
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(brandingRequestAction());

        const rawBranding = await fetchBranding(url);
        branding = getBrandingData(rawBranding);
        dispatch(brandingReceiveAction(branding));
      } catch (e) {
        const errorMessage =
          `Failed to fetch branding data by URL: "${url}", reason: ` +
          common.helpers.errors.getMessage(e);
        dispatch(brandingErrorAction(errorMessage));
        throw e;
      }

      // Use the products version if specified in product.json, otherwise use the default version given by che server
      if (!branding.productVersion) {
        try {
          dispatch(brandingRequestAction());

          const apiInfo = await fetchApiInfo();
          const brandingWithVersion = {
            ...branding,
            productVersion: apiInfo.implementationVersion,
          };

          dispatch(brandingReceiveAction(brandingWithVersion));
        } catch (e) {
          const errorMessage =
            'Failed to fetch the product version, reason: ' + common.helpers.errors.getMessage(e);
          dispatch(brandingErrorAction(errorMessage));
          throw e;
        }
      }
    },
};

export function getBrandingData(receivedBranding?: { [key: string]: any }): BrandingData {
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
