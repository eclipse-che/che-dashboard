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

export const devWorkspaceListSchema = {
  type: 'object',
  properties: {
    apiVersion: {
      type: 'string',
      example: 'workspace.devfile.io/v1alpha2'
    },
    metadata: {
      type: 'object',
      properties: {
        continue: { type: 'string' },
        resourceVersion: { type: 'string' },
      },
      example: {
        resourceVersion: '46875'
      }
    },
    kind: {
      type: 'string',
      example: 'DevWorkspaceList'
    },
    items: {
      type: 'array',
      example: [{
        schemaVersion: '2.1.0',
        metadata: {
          name: 'quarkus',
          namespace: 'che'
        },
        projects: [{
          name: 'quarkus-quickstarts',
          git: {
            remotes: {
              origin: 'https://github.com/che-samples/quarkus-quickstarts.git'
            }
          }
        }],
        components: [],
      }]
    },
  },
};

export const devWorkspaceSchema = {
  type: 'object',
  properties: {
    apiVersion: {
      type: 'string'
    },
    kind: {
      type: 'string'
    },
    metadata: {
      type: 'object'
    },
    spec: {
      type: 'object'
    },
    status: {
      type: 'object'
    },
  },
  required: ['apiVersion', 'kind', 'metadata',  'spec', 'status']
};

export const devfileStartedSchema = {
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

export const templateStartedSchema = {
    type: 'object',
    properties: {
      template: {
        type: 'object',
        properties: {
          apiVersion: { type: 'string' },
          kind: { type: 'string' },
          metadata: { type: 'object' },
          spec: {
            type: 'object',
            properties: {
              commands: { type: 'array' },
              components: { type: 'array' },
              events: { type: 'object' },
            },
          },
        },
        example: {
          apiVersion: 'workspace.devfile.io/v1alpha2',
          kind: 'DevWorkspaceTemplate',
          metadata: {
            name: 'che-theia-vsix-installer',
            managedFields: [],
            namespace: 'che',
            ownerReferences: [],
            resourceVersion: '0',
            uid: '12345',
          },
          spec: {
            commands: [],
            components: [],
            events: { preStart: ['copy-vsix'] }
          }
        }
      }
    }
};

