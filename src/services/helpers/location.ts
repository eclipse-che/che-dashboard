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

import { History, LocationDescriptorObject } from 'history';
import { ROUTE } from '../../route.enum';
import { GettingStartedTab, IdeLoaderTab, WorkspaceDetailsTab } from './types';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

export function buildIdeLoaderPath(workspace: che.Workspace, tab?: IdeLoaderTab): string {
  const name = workspace.devfile.metadata.name!;
  const namespace = workspace.namespace!;

  if (!tab) {
    return ROUTE.IDE_LOADER
      .replace(':namespace', namespace)
      .replace(':workspaceName', name);
  }

  const tabId = IdeLoaderTab[tab];
  return ROUTE.IDE_LOADER_TAB
    .replace(':namespace', namespace)
    .replace(':workspaceName', name)
    .replace(':tabId', tabId);
}

export function buildWorkspacesPath(): string {
  return ROUTE.WORKSPACES;
}

export function buildGettingStartedPath(tab?: GettingStartedTab): string {
  if (!tab) {
    return ROUTE.GET_STARTED;
  }

  return ROUTE.GET_STARTED_TAB
    .replace(':tabId', tab);
}

export function buildDetailsPath(workspace: che.Workspace, tab?: WorkspaceDetailsTab): string {
  const name = workspace.devfile.metadata.name!;
  const namespace = workspace.namespace!;

  if (!tab) {
    return ROUTE.WORKSPACE_DETAILS
      .replace(':namespace', namespace)
      .replace(':workspaceName', name);
  }

  const tabId = WorkspaceDetailsTab[tab];
  return ROUTE.WORKSPACE_DETAILS_TAB
    .replace(':namespace', namespace)
    .replace(':workspaceName', name)
    .replace(':tabId', tabId);

}

export function toHref(history: History, path: string): string {
  const location: LocationDescriptorObject = {
    pathname: path,
  };
  return history.createHref(location);
}
