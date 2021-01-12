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

export enum ROUTE {
  HOME = '/',
  GET_STARTED = '/get-started',
  TAB_GET_STARTED = '/get-started?tab=get-started',
  TAB_CUSTOM_WORKSPACE = '/get-started?tab=custom-workspace',
  WORKSPACES = '/workspaces',
  ADMINISTRATION = '/administration',
  WORKSPACE_DETAILS = '/workspace/:namespace/:workspaceName/',
  IDE = '/ide/:namespace/:workspaceName',
  LOAD_FACTORY = '/load-factory'
}
