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

import { getFactoryResolver } from '@/services/backend-client/factoryApi';
import { getYamlResolver } from '@/services/backend-client/yamlResolverApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { FactoryResolver } from '@/services/helpers/types';
import { isOAuthResponse } from '@/services/oauth';
import { CHE_EDITOR_YAML_PATH } from '@/services/workspace-client/helpers';
import { AppThunk } from '@/store';
import { FactoryResolverStateResolver } from '@/store/FactoryResolver';
import {
  grabLink,
  isDevfileRegistryLocation,
  normalizeDevfile,
} from '@/store/FactoryResolver/helpers';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';
import { selectDefaultComponents } from '@/store/ServerConfig/selectors';

export const factoryResolverRequestAction = createAction('factoryResolver/request');
export const factoryResolverReceiveAction =
  createAction<FactoryResolverStateResolver>('factoryResolver/receive');
export const factoryResolverErrorAction = createAction<string>('factoryResolver/error');

export const actionCreators = {
  requestFactoryResolver:
    (location: string, factoryParams: Partial<FactoryParams> = {}): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;
      const optionalFilesContent = {};

      const overrideParams = factoryParams
        ? Object.assign({}, factoryParams.overrides, {
            error_code: factoryParams?.errorCode,
          })
        : undefined;

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(factoryResolverRequestAction());

        let data: FactoryResolver;
        if (isDevfileRegistryLocation(location, state.dwServerConfig.config)) {
          data = await getYamlResolver(location);
        } else {
          data = await getFactoryResolver(location, overrideParams);
          const cheEditor = await grabLink(data.links || [], CHE_EDITOR_YAML_PATH);
          if (cheEditor) {
            optionalFilesContent[CHE_EDITOR_YAML_PATH] = cheEditor;
          }
        }

        if (!data.devfile) {
          throw new Error('The specified link does not contain any Devfile.');
        }

        const defaultComponents = selectDefaultComponents(state);
        const devfile = normalizeDevfile(
          data,
          location,
          defaultComponents,
          namespace,
          factoryParams,
        );

        const resolver = {
          ...data,
          devfile: devfile,
          location,
          optionalFilesContent,
        };
        dispatch(factoryResolverReceiveAction(resolver));
        return;
      } catch (e) {
        if (common.helpers.errors.includesAxiosResponse(e)) {
          const response = e.response;
          if (response.status === 401 && isOAuthResponse(response.data)) {
            throw response.data;
          }
        }
        const errorMessage = common.helpers.errors.getMessage(e);
        dispatch(factoryResolverErrorAction(errorMessage));
        throw e;
      }
    },
};
