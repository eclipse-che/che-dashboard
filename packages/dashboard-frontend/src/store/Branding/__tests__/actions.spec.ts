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

import { fetchApiInfo, fetchBranding } from '@/services/assets/branding';
import { BRANDING_DEFAULT, BrandingData } from '@/services/bootstrap/branding.constant';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  ASSET_PREFIX,
  brandingErrorAction,
  brandingReceiveAction,
  brandingRequestAction,
  getBrandingData,
} from '@/store/Branding/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('axios');
jest.mock('@/services/assets/branding');
jest.mock('@/store/SanityCheck');

describe('Branding', () => {
  let store: ReturnType<typeof createMockStore>;
  let brandingData: BrandingData;
  let expectedBrandingData: BrandingData;

  beforeEach(() => {
    store = createMockStore({});
    brandingData = { ...BRANDING_DEFAULT, productVersion: '1.0.0' };
    expectedBrandingData = {
      ...brandingData,
      logoFile: ASSET_PREFIX + brandingData.logoFile,
      logoTextFile: ASSET_PREFIX + brandingData.logoTextFile,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('actionCreators', () => {
    it('should dispatch brandingRequestAction and brandingReceiveAction on successful fetch', async () => {
      (fetchBranding as jest.Mock).mockResolvedValue(brandingData);
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      const expectedActions = [
        brandingRequestAction(),
        brandingReceiveAction(expectedBrandingData),
      ];

      await store.dispatch(actionCreators.requestBranding());

      const actions = store.getActions();
      expect(actions).toStrictEqual(expectedActions);
    });

    it('should dispatch brandingErrorAction on fetch failure', async () => {
      const error = new Error('Fetch failed');
      (fetchBranding as jest.Mock).mockRejectedValue(error);
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      jest.spyOn(common.helpers.errors, 'getMessage').mockReturnValue('Fetch failed');

      const expectedActions = [
        brandingRequestAction(),
        brandingErrorAction(
          'Failed to fetch branding data by URL: "./assets/branding/product.json", reason: Fetch failed',
        ),
      ];

      await expect(store.dispatch(actionCreators.requestBranding())).rejects.toThrow(
        'Fetch failed',
      );

      const actions = store.getActions();
      expect(actions).toStrictEqual(expectedActions);
    });

    it('should dispatch brandingReceiveAction with product version from API if not in branding data', async () => {
      const apiInfo = { implementationVersion: '2.0.0' };
      (fetchApiInfo as jest.Mock).mockResolvedValue(apiInfo);

      // Mock the first fetch to return branding data without product version
      const expectedBrandingDataNoVersion: BrandingData = {
        ...expectedBrandingData,
        productVersion: undefined,
      };
      (fetchBranding as jest.Mock).mockResolvedValue(expectedBrandingDataNoVersion);

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      const expectedBrandingDataWithVersion = {
        ...expectedBrandingDataNoVersion,
        productVersion: '2.0.0',
      };

      await store.dispatch(actionCreators.requestBranding());

      const actions = store.getActions();
      expect(actions).toHaveLength(4);
      expect(actions[0]).toEqual(brandingRequestAction());
      expect(actions[1]).toEqual(brandingReceiveAction(expectedBrandingDataNoVersion));
      expect(actions[2]).toEqual(brandingRequestAction());
      expect(actions[3]).toEqual(brandingReceiveAction(expectedBrandingDataWithVersion));
    });

    it('should dispatch brandingErrorAction on product version fetch failure', async () => {
      const error = new Error('Fetch failed');
      (fetchApiInfo as jest.Mock).mockRejectedValue(error);

      // Mock the first fetch to return branding data without product version
      const expectedBrandingDataNoVersion: BrandingData = {
        ...expectedBrandingData,
        productVersion: undefined,
      };
      (fetchBranding as jest.Mock).mockResolvedValue(expectedBrandingDataNoVersion);

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);

      // const expectedBrandingDataWithVersion = {
      //   ...expectedBrandingDataNoVersion,
      //   productVersion: '2.0.0',
      // };

      await expect(store.dispatch(actionCreators.requestBranding())).rejects.toThrow(
        'Fetch failed',
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(4);
      expect(actions[0]).toEqual(brandingRequestAction());
      expect(actions[1]).toEqual(brandingReceiveAction(expectedBrandingDataNoVersion));
      expect(actions[2]).toEqual(brandingRequestAction());
      // expect(actions[3]).toEqual(brandingReceiveAction(expectedBrandingDataWithVersion));
    });
  });

  describe('getBrandingData', () => {
    it('merges received branding data with default branding data', () => {
      const receivedBranding = { logoFile: 'custom-logo.png' };
      const expectedBranding = {
        ...expectedBrandingData,
        logoFile: ASSET_PREFIX + 'custom-logo.png',
        productVersion: undefined,
      };

      const result = getBrandingData(receivedBranding);
      expect(result).toEqual(expectedBranding);
    });

    it('returns default branding data if no received branding data', () => {
      const result = getBrandingData();
      const expectedBranding = {
        ...expectedBrandingData,
        productVersion: undefined,
      };
      expect(result).toEqual(expectedBranding);
    });
  });
});
