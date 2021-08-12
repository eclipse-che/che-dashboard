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

import axios from 'axios';
import {
  IDevWorkspaceDevfile,
  IDevWorkspace,
  IDevWorkspaces,
  IPatch,
} from '../../workspace-client/devWorkspaceClient/types';
import { getErrorMessage } from '../../helpers/getErrorMessage';
import { addAuthentication } from './auth';
import { prefix } from './const';

export async function createWorkspace(devfile: IDevWorkspaceDevfile, defaultNamespace: string, started: boolean): Promise<IDevWorkspace> {
  const headers = addAuthentication({});
  try {
    const response = await axios.post(`${prefix}/namespace/${defaultNamespace}/devworkspaces`, {
      devfile: devfile,
      started: started
    }, { headers });
    return response.data;
  } catch (e) {
    throw `Failed to create a new workspace. ${getErrorMessage(e)}`;
  }
}

export async function listWorkspacesInNamespace(defaultNamespace: string): Promise<IDevWorkspaces> {
  const headers = addAuthentication({});
  try {
    const response = await axios.get(`${prefix}/namespace/${defaultNamespace}/devworkspaces`, { headers });
    return response.data;
  } catch (e) {
    throw `Failed to fetch the list of devWorkspaces. ${getErrorMessage(e)}`;
  }
}

export async function getWorkspaceByName(namespace: string, workspaceName: string): Promise<IDevWorkspace> {
  const headers = addAuthentication({});
  try {
    const response = await axios.get(`${prefix}/namespace/${namespace}/devworkspaces/${workspaceName}`, { headers });
    return response.data;
  } catch (e) {
    throw `Failed to fetch workspace '${workspaceName}'. ${getErrorMessage(e)}`;
  }
}

export async function patchWorkspace(namespace: string, workspaceName: string, patch: IPatch[]): Promise<IDevWorkspace> {
  const headers = addAuthentication({});
  try {
    const response = await axios.patch(`${prefix}/namespace/${namespace}/devworkspaces/${workspaceName}`, patch, { headers });
    return response.data;
  } catch (e) {
    throw `Failed to update workspace '${workspaceName}'. ${getErrorMessage(e)}`;
  }
}

export async function deleteWorkspace(namespace: string, workspaceName: string): Promise<IDevWorkspace> {
  const headers = addAuthentication({});
  try {
    const response = await axios.delete(`${prefix}/namespace/${namespace}/devworkspaces/${workspaceName}`, { headers });
    return response.data;
  } catch (e) {
    throw `Failed to delete workspace '${workspaceName}'. ${getErrorMessage(e)}`;
  }
}
