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

export const templateExample = {
  apiVersion: 'workspace.devfile.io/v1alpha2',
  kind: 'DevWorkspaceTemplate',
  metadata: {
    name: 'che-theia-vsix-installer-workspace2d071d95b33a4835',
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
      preStart: ['copy-vsix']
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
};

export const dockerConfigExample = {
  get dockerconfig() {
    const registry = 'quay.io';
    const username = 'janedoe';
    const passsword = 'xxxxxxxxxxxxxxxxxxxxxxx';
    const auth = new Buffer(`${username}:${passsword}`).toString('base64');
    const buff = new Buffer(JSON.stringify({
      auths: {
        [registry]: { auth },
      }
    }));
    return buff.toString('base64');
  }
};

export const workspaceExample = {
  devworkspace: {
    kind: 'DevWorkspace',
    apiVersion: 'workspace.devfile.io/v1alpha2',
    metadata: {
      name: 'theia'
    },
    spec: {
      started: false,
      template: {
        projects: [
          {
            name: 'web-nodejs-sample',
            git: {
              remotes: {
                origin: 'https://github.com/che-samples/web-nodejs-sample.git'
              }
            }
          }
        ],
        components: [
          {
            name: 'plugins',
            volume: {}
          }, {
            name: 'theia-ide',
            attributes: {
              'app.kubernetes.io/name': 'che-theia.eclipse.org',
              'app.kubernetes.io/part-of': 'che.eclipse.org',
              'app.kubernetes.io/component': 'editor'
            },
            container: {
              image: 'quay.io/eclipse/che-theia:next',
              env: [
                {
                  name: 'THEIA_PLUGINS',
                  value: 'local-dir:///plugins'
                }, {
                  name: 'HOSTED_PLUGIN_HOSTNAME',
                  value: '0.0.0.0'
                }, {
                  name: 'HOSTED_PLUGIN_PORT',
                  value: '3130'
                }, {
                  name: 'THEIA_HOST',
                  value: '0.0.0.0'
                }
              ],
              volumeMounts: [
                {
                  path: '/plugins',
                  name: 'plugins'
                }
              ],
              mountSources: true,
              memoryLimit: '512M',
              endpoints: [
                {
                  name: 'theia',
                  exposure: 'public',
                  targetPort: 3100,
                  secure: true,
                  protocol: 'http',
                  attributes: {
                    type: 'main'
                  }
                }, {
                  name: 'webviews',
                  exposure: 'public',
                  targetPort: 3100,
                  protocol: 'http',
                  secure: true,
                  attributes: {
                    type: 'webview',
                    unique: 'true'
                  }
                }, {
                  name: 'theia-dev',
                  exposure: 'public',
                  targetPort: 3130,
                  protocol: 'http',
                  attributes: {
                    type: 'ide-dev'
                  }
                }, {
                  name: 'theia-redir-1',
                  exposure: 'public',
                  targetPort: 13131,
                  protocol: 'http'
                }, {
                  name: 'theia-redir-2',
                  exposure: 'public',
                  targetPort: 13132,
                  protocol: 'http'
                }, {
                  name: 'theia-redir-3',
                  exposure: 'public',
                  targetPort: 13133,
                  protocol: 'http'
                }
              ]
            }
          },
          {
            name: 'che-theia-terminal',
            attributes: {
              'app.kubernetes.io/name': 'che-theia.eclipse.org',
              'app.kubernetes.io/part-of': 'che.eclipse.org',
              'app.kubernetes.io/component': 'che-theia-terminal'
            },
            container: {
              image: 'quay.io/eclipse/che-machine-exec:nightly',
              command: [
                '/go/bin/che-machine-exec'
              ],
              args: [
                '--url',
                '0.0.0.0:3333',
                '--pod-selector',
                'controller.devfile.io/workspace_id=$(DEVWORKSPACE_ID)'
              ],
              endpoints: [
                {
                  name: 'che-theia-terminal',
                  exposure: 'public',
                  targetPort: 3333,
                  protocol: 'ws',
                  secure: true,
                  attributes: {
                    type: 'collocated-terminal'
                  }
                }
              ]
            }
          }
        ],
        commands: [
          {
            id: 'say-hello',
            exec: {
              component: 'plugin',
              commandLine: 'echo "Hello from $(pwd)"',
              workingDir: '${PROJECTS_ROOT}/project/app'
            }
          }
        ]
      }
    }
  }
};
