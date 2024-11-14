/* c8 ignore start */

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

import { createAction } from '@reduxjs/toolkit';

import devfileApi from '@/services/devfileApi';

export const devWorkspacesRequestAction = createAction('devWorkspaces/request');
export const devWorkspacesErrorAction = createAction<string>('devWorkspaces/error');
type DevWorkspacesReceivePayload = {
  workspaces: devfileApi.DevWorkspace[];
  resourceVersion: string;
};
export const devWorkspacesReceiveAction =
  createAction<DevWorkspacesReceivePayload>('devWorkspaces/receive');

export const devWorkspacesUpdateAction = createAction<devfileApi.DevWorkspace | undefined>(
  'devWorkspaces/update',
);
export const devWorkspacesDeleteAction =
  createAction<devfileApi.DevWorkspace>('devWorkspaces/delete');
type DevWorkspaceTerminatePayload = {
  workspaceUID: string;
  message: string;
};
export const devWorkspacesTerminateAction =
  createAction<DevWorkspaceTerminatePayload>('devWorkspaces/terminate');

export const devWorkspacesAddAction = createAction<devfileApi.DevWorkspace>('devWorkspaces/add');

export const devWorkspacesUpdateStartedAction = createAction<devfileApi.DevWorkspace[]>(
  'devWorkspaces/updateStarted',
);
type DevWorkspaceWarningUpdatePayload = {
  workspace: devfileApi.DevWorkspace;
  warning: string;
};
export const devWorkspaceWarningUpdateAction = createAction<DevWorkspaceWarningUpdatePayload>(
  'devWorkspaceWarning/update',
);
