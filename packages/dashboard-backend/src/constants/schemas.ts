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

export const authenticationHeaderSchema = {
    type: 'object',
    properties: {
        'authorization': {
          type: 'string'
        }
    },
    // todo when authorization is missing it leads to 400 Bad request, bad the best practise it to return 401 Unauthorized
    required: ['authorization']
};

export const namespacedWorkspaceSchema = {
  type: 'object',
  properties: {
    namespace: {
      type: 'string'
    },
    workspaceName: {
      type: 'string'
    }
  },
  required: ['namespace', 'workspaceName']
};

export const namespacedSchema = {
  type: 'object',
  properties: {
    namespace: {
      type: 'string'
    },
  },
  required: ['namespace']
};

export const devfileStartedBody = {
  type: 'object',
  properties: {
    devfile: {
      type: 'object'
    },
    started: {
      type: 'boolean'
    }
  },
  required: ['devfile', 'started']
};

export const templateStartedBody = {
    type: 'object',
    properties: {
      template: {
        type: 'object'
      }
    },
    required: ['template']
};
