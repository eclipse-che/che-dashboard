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

import { Location } from 'react-router-dom';

import { buildFactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { Workspace } from '@/services/workspace-adapter';

/**
 * Checks if the current URL is a factory flow URL.
 * A factory flow URL is identified by the path ending with '/dashboard/' and the hash starting with '#/load-factory?'.
 * @param location - The current location object from React Router
 * @returns {boolean} - Returns true if the current URL is a factory flow URL,
 */
export function checkFactoryFlow(location: Location): boolean {
  const pathname = location.pathname || '';
  const search = location.search || '';

  const searchParams = new URLSearchParams(search); // Ensure search is a valid URLSearchParams object
  const factoryParams = buildFactoryParams(searchParams);

  // Check if the current URL is a factory flow URL
  return pathname === '/load-factory' && factoryParams.sourceUrl !== '';
}

/**
 * Checks if a new workspace should be created based on the current factory flow parameters and existing workspaces.
 * If the policy is 'perclick', a new workspace is always created.
 * If there are no existing workspaces with the same source URL, a new workspace is created.
 * If there are existing workspaces with the same source URL, a new workspace is not created
 * @param workspaces - The list of existing workspaces
 * @param location - The current location object from React Router
 * @return {boolean} - Returns true if a new workspace should be created, false otherwise.
 */
export function checkCreateFlow(location: Location, workspaces: Workspace[]): boolean {
  const checkFactory = checkFactoryFlow(location);
  if (!checkFactory) {
    return false; // Not a factory flow URL, no need to check for workspace creation
  }
  const search = location.search || '';
  // If the location is a factory flow URL, we proceed to check the search parameters
  const searchParams = new URLSearchParams(search); // Ensure search is a valid URLSearchParams object
  // Build factory parameters from the search parameters
  const factoryParams = buildFactoryParams(searchParams);
  // If the policy is 'perclick', we create a new workspace
  if (factoryParams.policiesCreate === 'perclick') {
    return true;
  }
  // If the policy is 'peruser', we check for existing workspaces with the same source URL
  const sameRepoWorkspaces = workspaces.filter(w => w.source === factoryParams.sourceUrl);

  return sameRepoWorkspaces.length === 0; // If there are no workspaces with the same source URL, we create a new one
}
