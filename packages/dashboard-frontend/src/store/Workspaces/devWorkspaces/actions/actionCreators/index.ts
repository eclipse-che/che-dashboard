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

import { createWorkspaceFromDevfile } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/createWorkspaceFromDevfile';
import { createWorkspaceFromResources } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/createWorkspaceFromResources';
import { handleWebSocketMessage } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/handleWebSocketMessage';
import { requestWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/requestWorkspace';
import { requestWorkspaces } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/requestWorkspaces';
import { restartWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/restartWorkspace';
import { startWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/startWorkspace';
import { stopWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/stopWorkspace';
import { terminateWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/terminateWorkspace';
import { updateWorkspace } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/updateWorkspace';
import { updateWorkspaceAnnotation } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/updateWorkspaceAnnotation';
import { updateWorkspaceWithDefaultDevfile } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/updateWorkspaceWithDefaultDevfile';

export const onStatusChangeCallbacks = new Map<string, (status: string) => void>();

export const actionCreators = {
  createWorkspaceFromDevfile: createWorkspaceFromDevfile,
  createWorkspaceFromResources,
  handleWebSocketMessage,
  requestWorkspace,
  requestWorkspaces,
  restartWorkspace,
  startWorkspace,
  stopWorkspace,
  terminateWorkspace,
  updateWorkspace,
  updateWorkspaceAnnotation,
  updateWorkspaceWithDefaultDevfile,
};
