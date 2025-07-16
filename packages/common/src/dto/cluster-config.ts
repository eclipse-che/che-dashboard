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

export type Architecture = 'x86_64' | 'arm64' | 's390x' | 'ppc64le';

export interface ClusterConfig {
  dashboardWarning?: string;
  dashboardFavicon?: {
    base64data: string;
    mediatype: string;
  };
  allWorkspacesLimit: number;
  runningWorkspacesLimit: number;
  currentArchitecture?: Architecture;
}
