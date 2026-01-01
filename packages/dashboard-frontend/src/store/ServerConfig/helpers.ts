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

import { api } from '@eclipse-che/common';

import { che } from '@/services/models';
import { ServerConfigState } from '@/store/ServerConfig/index';

export function isSourceAllowed(allowedSourceUrls: string[] | undefined, url: string): boolean {
  if (allowedSourceUrls === undefined || allowedSourceUrls.length === 0) {
    return true;
  }

  for (const allowedSourceUrl of allowedSourceUrls) {
    if (allowedSourceUrl.includes('*')) {
      let pattern = allowedSourceUrl.trim();
      if (!pattern.startsWith('*')) {
        pattern = `^${pattern}`;
      }
      if (!pattern.endsWith('*')) {
        pattern = `${pattern}$`;
      }
      pattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      if (regex.test(url)) {
        return true;
      }
    } else {
      if (allowedSourceUrl.trim() === url) {
        return true;
      }
    }
  }

  return false;
}

export function getPvcStrategy(state?: Partial<ServerConfigState>): che.WorkspaceStorageType {
  const pvcStrategy = state?.config?.defaults?.pvcStrategy;
  switch (pvcStrategy) {
    case 'per-user':
      return pvcStrategy;
    case 'per-workspace':
      return pvcStrategy;
    case 'ephemeral':
      return pvcStrategy;
    case 'common':
      return 'per-user';
    default:
      return '';
  }
}

export function getDefaultEditor(config: api.IServerConfig): string {
  return config.defaults?.editor || 'che-incubator/che-code/latest';
}

/**
 * Returns the current SCC (Security Context Constraint) name based on container capabilities configuration.
 * Priority: containerRun > containerBuild
 * Returns undefined if no SCC is required (all container capabilities are disabled).
 */
export function getCurrentScc(config: api.IServerConfig): string | undefined {
  const { containerRun, containerBuild } = config;

  // Check containerRun first (higher priority)
  if (!containerRun?.disableContainerRunCapabilities) {
    const scc = containerRun?.containerRunConfiguration?.openShiftSecurityContextConstraint;
    if (scc) {
      return scc;
    }
  }

  // Check containerBuild if containerRun is disabled or has no SCC
  if (!containerBuild?.disableContainerBuildCapabilities) {
    const scc = containerBuild?.containerBuildConfiguration?.openShiftSecurityContextConstraint;
    if (scc) {
      return scc;
    }
  }

  return undefined;
}
