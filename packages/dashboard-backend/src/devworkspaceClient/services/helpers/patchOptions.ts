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

import { PatchStrategy } from '@kubernetes/client-node';
import {
  ConfigurationOptions,
  RequestContext,
  ResponseContext,
} from '@kubernetes/client-node/dist/gen';
import { wrapOptions } from '@kubernetes/client-node/dist/gen/configuration';

/**
 * Creates a middleware that explicitly sets the Content-Type header for patch requests.
 * This ensures consistent behavior regardless of @kubernetes/client-node defaults.
 */
function createPatchMiddleware(contentType: string) {
  return {
    pre: async (context: RequestContext): Promise<RequestContext> => {
      context.setHeaderParam('Content-Type', contentType);
      return context;
    },
    post: async (context: ResponseContext): Promise<ResponseContext> => {
      return context;
    },
  };
}

/**
 * Configuration options for patch operations on built-in Kubernetes resources (ConfigMaps, etc.).
 * Uses strategic-merge-patch for merge patch format: { data: { key: value } }
 */
export const STRATEGIC_MERGE_PATCH_OPTIONS: ConfigurationOptions = wrapOptions({
  middleware: [createPatchMiddleware(PatchStrategy.StrategicMergePatch)],
})!;

/**
 * Configuration options for patch operations on Custom Resources (DevWorkspaces, etc.).
 * Uses json-patch for JSON Patch array format: [{ op: 'replace', path: '...', value: '...' }]
 */
export const JSON_PATCH_OPTIONS: ConfigurationOptions = wrapOptions({
  middleware: [createPatchMiddleware(PatchStrategy.JsonPatch)],
})!;
