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

import { AlertVariant } from '@patternfly/react-core';
import * as React from 'react';

export interface AlertItem {
  key: string;
  title: string;
  variant: AlertVariant;
  children?: React.ReactNode;
}

export interface FactoryResolver {
  v: string;
  source: string;
  devfile: api.che.workspace.devfile.Devfile
}

export enum WorkspaceStatus {
  RUNNING = 1,
  STOPPING,
  STOPPED,
  STARTING,
  PAUSED,
  ERROR,
}

export enum IdeLoaderTabs {
  Progress = 0,
  Logs = 1,
}
