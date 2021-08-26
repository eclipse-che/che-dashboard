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

export const template = {
    apiVersion: 'workspace.devfile.io/v1alpha2',
    kind: 'DevWorkspaceTemplate',
    metadata: {
      name: 'che-theia-vsix-installer-workspace2d071d95b33a4835',
      namespace: 'admin-che',
      ownerReferences: [
        {
          apiVersion: 'workspace.devfile.io/v1alpha2',
          kind: 'devworkspace',
          name: 'spring-petclinic-oqo7',
          uid: '2d071d95-b33a-4835-9f66-5e1f3a42d7b8'
        }
      ]
    },
    spec: {
      components: [
        {
          name: 'vsix-installer',
          attributes: {
            'app.kubernetes.io/part-of': 'che-theia.eclipse.org',
            'app.kubernetes.io/component': 'vsix-installer'
          },
          container: {
            image: 'quay.io/eclipse/che-theia-vsix-installer:next',
            volumeMounts: [
              {
                path: '/plugins',
                name: 'plugins'
              }
            ],
            env: [
              {
                name: 'CHE_DASHBOARD_URL',
                value: 'https://192.168.64.5.nip.io'
              },
              {
                name: 'CHE_PLUGIN_REGISTRY_URL',
                value: 'https://192.168.64.5.nip.io/plugin-registry/v3'
              }
            ]
          }
        }
      ],
      events: {
        preStart: [ 'copy-vsix' ]
      },
      commands: [
        {
          id: 'copy-vsix',
          apply: {
            component: 'vsix-installer'
          }
        }
      ]
    }
}

export const devfile = {
  schemaVersion: '2.1.0',
  metadata: {
    name: 'spring-petclinic-6kcf'
  },
  attributes: {
    'che-theia.eclipse.org/sidecar-policy': 'USE_DEV_CONTAINER'
  },
  projects: [
    {
      name: 'java-spring-petclinic',
      git: {
        remotes: {
          'origin': 'https://github.com/che-samples/java-spring-petclinic.git'
        },
        checkoutFrom: {
          'revision': 'devfilev2'
        }
      }
    }
  ],
  components: [
    {
      name: 'tools',
      container: {
        'image': 'quay.io/eclipse/che-java11-maven:next',
        'endpoints': [
          {
            'exposure': 'none',
            'name': 'debug',
            'protocol': 'tcp',
            'targetPort': 5005
          },
          {
            'exposure': 'public',
            'name': '8080-tcp',
            'protocol': 'http',
            'targetPort': 8080
          }
        ],
        'volumeMounts': [
          {
            'name': 'm2',
            'path': '/home/user/.m2'
          }
        ],
        'memoryLimit': '1536M'
      }
    },
    {
      name: 'm2',
      volume: {
        'size': '1G'
      }
    }
  ],
  commands: [
    {
      id: 'build',
      exec: {
        'component': 'tools',
        'workingDir': '${PROJECTS_ROOT}/spring-petclinic',
        'commandLine': 'mvn clean install',
        'group': {
          'kind': 'build',
          'isDefault': true
        }
      }
    },
    {
      id: 'run',
      exec: {
        'component': 'tools',
        'workingDir': '${PROJECTS_ROOT}/spring-petclinic',
        'commandLine': 'java -jar -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005 target/*.jar',
        'group': {
          'kind': 'run',
          'isDefault': true
        }
      }
    }
  ]
};
