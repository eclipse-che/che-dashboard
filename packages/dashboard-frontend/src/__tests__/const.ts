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

import { FactoryResolver } from '@/services/helpers/types';

export const REQUEST_TIME_200 = 200;
export const REQUEST_TIME_300 = 300;
export const REQUEST_TIME_400 = 400;
export const REQUEST_TIME_500 = 500;
export const REQUEST_TIME_600 = 600;
export const REQUEST_TIME_700 = 700;
export const REQUEST_TIME_800 = 800;
export const REQUEST_TIME_1300 = 1300;

export const TIME_LIMIT = 9000;

export const namespace = { name: 'user-che', attributes: { phase: 'Active' } };
export const url = 'https://github.com/eclipse-che/che-dashboard';
export const devfile = {
  schemaVersion: '2.2.0',
  metadata: {
    name: 'che-dashboard',
    namespace: namespace.name,
  },
  components: [
    {
      name: 'universal-developer-image',
      container: {
        image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
      },
    },
  ],
  commands: [],
};
export const factoryResolverData: FactoryResolver = {
  v: '4.0',
  source: 'devfile.yaml',
  scm_info: {
    clone_url: 'https://github.com/eclipse-che/che-dashboard.git',
    scm_provider: 'github',
  },
  devfile: devfile,
  links: [],
};
export const devworkspaceResources = `
apiVersion: workspace.devfile.io/v1alpha2
kind: DevWorkspaceTemplate
metadata:
  name: che-code
---
apiVersion: workspace.devfile.io/v1alpha2
kind: DevWorkspace
metadata:
  name: che-dashboard
spec:
  started: false
  template:
    components:
      - name: universal-developer-image
        container:
          image: quay.io/devfile/universal-developer-image:ubi8-latest
    projects:
      - name: che-dashboard
        git:
          remotes:
            origin: https://github.com/eclipse-che/che-dashboard.git
`;
export const serverConfigData = {
  containerBuild: {
    containerBuildConfiguration: {
      openShiftSecurityContextConstraint: 'container-build',
    },
    disableContainerBuildCapabilities: false,
  },
  defaults: {
    editor: 'che-incubator/che-code/insiders',
    plugins: [],
    components: [
      {
        name: 'universal-developer-image',
        container: {
          image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
        },
      },
    ],
    pvcStrategy: 'per-workspace',
  },
  timeouts: {
    inactivityTimeout: 10800,
    runTimeout: 86400,
    startTimeout: 300,
  },
  devfileRegistry: {
    disableInternalRegistry: false,
    externalDevfileRegistries: [
      {
        url: 'https://registry.devfile.io/',
      },
    ],
  },
  defaultNamespace: {
    autoProvision: true,
  },
  pluginRegistry: {
    deployment: {
      securityContext: {},
    },
    openVSXURL: 'https://open-vsx.org',
  },
  cheNamespace: 'eclipse-che',
  pluginRegistryURL: '',
  pluginRegistryInternalURL: '',
  allowedSourceUrls: [],
};
export const kubernetesNamespacesData = [
  {
    name: 'user-che',
    attributes: {
      phase: 'Active',
      description: '',
      displayName: '',
    },
  },
];
export const eventsData = {
  apiVersion: 'v1',
  items: [],
  kind: 'EventList',
  metadata: {
    resourceVersion: '1234567890',
  },
};
export const podsData = {
  apiVersion: 'v1',
  items: [],
  kind: 'PodList',
  metadata: {
    resourceVersion: '1234567890',
  },
};
export const clusterConfigData = {
  dashboardWarning: '',
  allWorkspacesLimit: -1,
  runningWorkspacesLimit: '2',
};
export const sshKeysData = [
  {
    creationTimestamp: '2024-07-10T09:59:35.000Z',
    name: 'git-ssh-key',
    keyPub: 'Z2l0LXNzaC1rZXk=',
  },
];
export const workspacePreferencesData = {
  'skip-authorisation': [],
  'trusted-sources': '*',
};
export const editorsData = [
  {
    metadata: {
      attributes: {
        firstPublicationDate: '2021-10-31',
        publisher: 'che-incubator',
        repository: 'https://github.com/che-incubator/che-code',
        title: 'Microsoft Visual Studio Code - Open Source IDE for Eclipse Che - Insiders build',
        version: 'insiders',
      },
      description:
        'Microsoft Visual Studio Code - Open Source IDE for Eclipse Che - Insiders build',
      displayName: 'VS Code - Open Source',
      name: 'che-code',
      tags: ['Tech-Preview'],
    },
    schemaVersion: '2.2.2',
  },
];
export const devworkspacesPostData = {
  apiVersion: 'workspace.devfile.io/v1alpha2',
  kind: 'DevWorkspace',
  metadata: {
    name: 'che-dashboard',
    namespace: 'user-che',
    resourceVersion: '1234567890',
    uid: 'dev-workspace-uid',
  },
  spec: {
    contributions: [
      {
        kubernetes: {
          name: 'che-code-che-dashboard',
        },
        name: 'editor',
      },
    ],
    routingClass: 'che',
    started: false,
    template: {
      projects: [
        {
          git: {
            remotes: {
              origin: 'https://github.com/eclipse-che/che-dashboard.git',
            },
          },
          name: 'che-dashboard',
        },
      ],
    },
  },
};
export const devworkspaceTemplatesData = {
  apiVersion: 'workspace.devfile.io/v1alpha2',
  kind: 'DevWorkspaceTemplate',
  metadata: {
    annotations: {
      'che.eclipse.org/components-update-policy': 'managed',
      'che.eclipse.org/plugin-registry-url': 'che-incubator/che-code/insiders',
    },
    generation: 1,
    name: 'che-code-che-dashboard',
    namespace: 'user-che',
    ownerReferences: [
      {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'devworkspace',
        name: 'che-dashboard',
        uid: 'dev-workspace-uid',
      },
    ],
    resourceVersion: '1886888014',
  },
  spec: {},
};
export const devWorkspaceWebSocketData = {
  channel: 'devWorkspace',
  message: {
    eventPhase: 'ADDED',
    devWorkspace: {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspace',
      metadata: {
        name: 'che-dashboard',
        namespace: 'user-che',
        resourceVersion: '1234567890',
        uid: 'dev-workspace-uid',
      },
      spec: {
        routingClass: 'che',
        started: true,
        template: {
          projects: [
            {
              git: {
                remotes: {
                  origin: 'https://github.com/eclipse-che/che-dashboard.git',
                },
              },
              name: 'che-dashboard',
            },
          ],
        },
      },
      status: {
        phase: 'Running',
      },
    },
  },
};
