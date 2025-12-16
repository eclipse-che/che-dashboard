/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { helpers } from '@eclipse-che/common';
import { createAction } from '@reduxjs/toolkit';

import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import { AppThunk } from '@/store';
import { RegistryEntry } from '@/store/DockerConfig';
import { selectDefaultNamespace } from '@/store/InfrastructureNamespaces/selectors';
import { verifyAuthorized } from '@/store/SanityCheck';

export const dockerConfigRequestAction = createAction('dockerConfig/request');
type DockerConfigReceivePayload = {
  registries: RegistryEntry[];
};
export const dockerConfigReceiveAction =
  createAction<DockerConfigReceivePayload>('dockerConfig/receive');
export const dockerConfigErrorAction = createAction<string>('dockerConfig/error');

export const actionCreators = {
  requestCredentials:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const namespace = selectDefaultNamespace(getState()).name;
      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(dockerConfigRequestAction());

        const { registries } = await getDockerConfig(namespace);
        dispatch(dockerConfigReceiveAction({ registries }));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(dockerConfigErrorAction(errorMessage));
        throw e;
      }
    },

  updateCredentials:
    (registries: RegistryEntry[]): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const namespace = selectDefaultNamespace(state).name;

      try {
        await verifyAuthorized(dispatch, getState);

        dispatch(dockerConfigRequestAction());

        await putDockerConfig(namespace, registries);
        dispatch(dockerConfigReceiveAction({ registries }));
      } catch (e) {
        const errorMessage = helpers.errors.getMessage(e);
        dispatch(dockerConfigErrorAction(errorMessage));
        throw e;
      }
    },
};

export async function getDockerConfig(namespace: string): Promise<{ registries: RegistryEntry[] }> {
  let dockerconfig: string | undefined;
  try {
    dockerconfig = await DwApi.getDockerConfig(namespace);
  } catch (e) {
    throw new Error('Failed to request the docker config. Reason: ' + helpers.errors.getMessage(e));
  }

  const registries: RegistryEntry[] = [];
  if (dockerconfig) {
    try {
      const auths = JSON.parse(window.atob(dockerconfig))['auths'];
      Object.keys(auths).forEach(key => {
        const [username, password] = window.atob(auths[key]['auth']).split(':');
        registries.push({ url: key, username, password });
      });
    } catch (e) {
      throw new Error('Unable to decode and parse data. Reason: ' + helpers.errors.getMessage(e));
    }
  }
  return { registries };
}

export async function putDockerConfig(
  namespace: string,
  registries: RegistryEntry[],
): Promise<string> {
  let config = '';

  try {
    const authInfo = { auths: {} };
    registries.forEach(item => {
      const { url, username, password } = item;
      authInfo.auths[url] = { username, password, auth: window.btoa(username + ':' + password) };
    });
    config = window.btoa(JSON.stringify(authInfo));
  } catch (e) {
    throw new Error('Unable to parse and code data. Reason: ' + helpers.errors.getMessage(e));
  }

  try {
    return await DwApi.putDockerConfig(namespace, config);
  } catch (err) {
    throw new Error(
      'Failed to update the docker config. Reason: ' + helpers.errors.getMessage(err),
    );
  }
}
