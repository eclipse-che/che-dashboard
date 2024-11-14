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

import devfileApi from '@/services/devfileApi';
import { che } from '@/services/models';
import { fetchDevfile, fetchRegistryMetadata } from '@/services/registry/devfiles';
import { fetchResources, loadResourcesContent } from '@/services/registry/resources';
import { AppThunk } from '@/store';
import { verifyAuthorized } from '@/store/SanityCheck';

/** Registry Metadata Actions */

export const registryMetadataRequestAction = createAction('devfileRegistries/request');

type RegistryMetadataReceivePayload = {
  url: string;
  metadata: che.DevfileMetaData[];
};
export const registryMetadataReceiveAction = createAction<RegistryMetadataReceivePayload>(
  'devfileRegistries/receive',
);

type RegistryMetadataErrorPayload = {
  url: string;
  error: string;
};
export const registryMetadataErrorAction =
  createAction<RegistryMetadataErrorPayload>('devfileRegistries/error');

/** Devfile Actions */

export const devfileRequestAction = createAction('devfile/request');

type DevfileReceivePayload = {
  url: string;
  devfile: string;
};
export const devfileReceiveAction = createAction<DevfileReceivePayload>('devfile/receive');

/** Resources Actions */

export const resourcesRequestAction = createAction('resources/request');

type ResourcesReceiveActionPayload = {
  url: string;
  devWorkspace: devfileApi.DevWorkspace;
  devWorkspaceTemplate: devfileApi.DevWorkspaceTemplate;
};
export const resourcesReceiveAction =
  createAction<ResourcesReceiveActionPayload>('resources/receive');

type resourcesErrorAction = {
  url: string;
  error: string;
};
export const resourcesErrorAction = createAction<resourcesErrorAction>('resources/error');

/** Filter Actions */

export const filterSetAction = createAction<string>('devfileRegistries/setFilter');
export const filterClearAction = createAction('devfileRegistries/clearFilter');

export const actionCreators = {
  /**
   * Request devfile metadata from available registries. `registryUrls` is space-separated list of urls.
   */
  requestRegistriesMetadata:
    (registryUrls: string, isExternal: boolean): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const registries: string[] = registryUrls.split(' ');
      const promises = registries.map(async url => {
        try {
          await verifyAuthorized(dispatch, getState);

          dispatch(registryMetadataRequestAction());

          const metadata: che.DevfileMetaData[] = await fetchRegistryMetadata(url, isExternal);

          dispatch(registryMetadataReceiveAction({ url, metadata }));
        } catch (e) {
          const error = common.helpers.errors.getMessage(e);
          dispatch(registryMetadataErrorAction({ url, error }));
          throw e;
        }
      });
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'rejected') {
          throw new Error(result.reason);
        }
      });
    },

  requestDevfile:
    (url: string): AppThunk<Promise<string>> =>
    async (dispatch, getState): Promise<string> => {
      await verifyAuthorized(dispatch, getState);

      dispatch(devfileRequestAction());

      const devfile = await fetchDevfile(url);

      dispatch(devfileReceiveAction({ url, devfile }));
      return devfile;
    },

  requestResources:
    (resourcesUrl: string): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(resourcesRequestAction());

        const resourcesContent = await fetchResources(resourcesUrl);
        const resources = loadResourcesContent(resourcesContent);

        const devWorkspace = resources.find(
          resource => resource.kind === 'DevWorkspace',
        ) as devfileApi.DevWorkspace;
        if (!devWorkspace) {
          throw new Error('Failed to find a DevWorkspace in the fetched resources.');
        }

        const devWorkspaceTemplate = resources.find(
          resource => resource.kind === 'DevWorkspaceTemplate',
        ) as devfileApi.DevWorkspaceTemplate;
        if (!devWorkspaceTemplate) {
          throw new Error('Failed to find a DevWorkspaceTemplate in the fetched resources.');
        }

        dispatch(
          resourcesReceiveAction({
            url: resourcesUrl,
            devWorkspace,
            devWorkspaceTemplate,
          }),
        );
      } catch (e) {
        dispatch(
          resourcesErrorAction({
            url: resourcesUrl,
            error: common.helpers.errors.getMessage(e),
          }),
        );
        throw e;
      }
    },

  setFilter:
    (value: string): AppThunk<void> =>
    dispatch =>
      dispatch(filterSetAction(value)),
  clearFilter: (): AppThunk<void> => dispatch => dispatch(filterClearAction()),
};
