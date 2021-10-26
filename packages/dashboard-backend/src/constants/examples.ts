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

export const templateExample =
  {
    template: {
      'kind': 'DevWorkspaceTemplate',
      'apiVersion': 'workspace.devfile.io/v1alpha2',
      'metadata': {
        'name': 'theia-ide-workspace01e2ddf2213f464f',
        'ownerReferences': [
          {
            'apiVersion': 'workspace.devfile.io/v1alpha2',
            'kind': 'devworkspace',
            'name': 'nodejs-mongodb',
            'namespace': 'admin-che',
            'uid': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
          }
        ]
      },
      'spec': {
        'schemaVersion': '2.1.0',
        'metadata': {
          'name': 'theia-ide'
        },
        'commands': [
          {
            'id': 'init-container-command',
            'apply': {
              'component': 'remote-runtime-injector'
            }
          }
        ],
        'events': {
          'preStart': [
            'init-container-command'
          ]
        },
        'components': [
          {
            'name': 'theia-ide',
            'container': {
              'image': 'quay.io/eclipse/che-theia:next',
              'env': [
                {
                  'name': 'THEIA_PLUGINS',
                  'value': 'local-dir:///plugins'
                },
                {
                  'name': 'HOSTED_PLUGIN_HOSTNAME',
                  'value': '0.0.0.0'
                },
                {
                  'name': 'HOSTED_PLUGIN_PORT',
                  'value': '3130'
                },
                {
                  'name': 'THEIA_HOST',
                  'value': '127.0.0.1'
                },
                {
                  'name': 'CHE_DASHBOARD_URL',
                  'value': 'http://localhost:8080'
                },
                {
                  'name': 'CHE_PLUGIN_REGISTRY_URL',
                  'value': 'https://192.168.64.9.nip.io/plugin-registry/v3'
                },
                {
                  'name': 'CHE_PLUGIN_REGISTRY_INTERNAL_URL',
                  'value': 'http://plugin-registry.eclipse-che.svc:8080/v3'
                }
              ],
              'volumeMounts': [
                {
                  'name': 'plugins',
                  'path': '/plugins'
                },
                {
                  'name': 'theia-local',
                  'path': '/home/theia/.theia'
                }
              ],
              'mountSources': true,
              'memoryLimit': '512M',
              'cpuLimit': '1500m',
              'cpuRequest': '100m',
              'endpoints': [
                {
                  'name': 'theia',
                  'attributes': {
                    'type': 'main',
                    'cookiesAuthEnabled': true,
                    'discoverable': false,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 3100,
                  'exposure': 'public',
                  'secure': false,
                  'protocol': 'https'
                },
                {
                  'name': 'webviews',
                  'attributes': {
                    'type': 'webview',
                    'cookiesAuthEnabled': true,
                    'discoverable': false,
                    'unique': true,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 3100,
                  'exposure': 'public',
                  'secure': false,
                  'protocol': 'https'
                },
                {
                  'name': 'mini-browser',
                  'attributes': {
                    'type': 'mini-browser',
                    'cookiesAuthEnabled': true,
                    'discoverable': false,
                    'unique': true,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 3100,
                  'exposure': 'public',
                  'secure': false,
                  'protocol': 'https'
                },
                {
                  'name': 'theia-dev',
                  'attributes': {
                    'type': 'ide-dev',
                    'discoverable': false,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 3130,
                  'exposure': 'public',
                  'protocol': 'http'
                },
                {
                  'name': 'theia-redirect-1',
                  'attributes': {
                    'discoverable': false,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 13131,
                  'exposure': 'public',
                  'protocol': 'http'
                },
                {
                  'name': 'theia-redirect-2',
                  'attributes': {
                    'discoverable': false,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 13132,
                  'exposure': 'public',
                  'protocol': 'http'
                },
                {
                  'name': 'theia-redirect-3',
                  'attributes': {
                    'discoverable': false,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 13133,
                  'exposure': 'public',
                  'protocol': 'http'
                },
                {
                  'name': 'terminal',
                  'attributes': {
                    'type': 'collocated-terminal',
                    'discoverable': false,
                    'cookiesAuthEnabled': true,
                    'urlRewriteSupported': true
                  },
                  'targetPort': 3333,
                  'exposure': 'public',
                  'secure': false,
                  'protocol': 'wss'
                }
              ]
            },
            'attributes': {
              'app.kubernetes.io/component': 'che-theia',
              'app.kubernetes.io/part-of': 'che-theia.eclipse.org'
            }
          },
          {
            'name': 'plugins',
            'volume': {}
          },
          {
            'name': 'theia-local',
            'volume': {}
          },
          {
            'name': 'che-machine-exec',
            'container': {
              'image': 'quay.io/eclipse/che-machine-exec:next',
              'command': [
                '/go/bin/che-machine-exec',
                '--url',
                '127.0.0.1:3333'
              ],
              'memoryLimit': '128Mi',
              'memoryRequest': '32Mi',
              'cpuLimit': '500m',
              'cpuRequest': '30m',
              'env': [
                {
                  'name': 'CHE_DASHBOARD_URL',
                  'value': 'http://localhost:8080'
                },
                {
                  'name': 'CHE_PLUGIN_REGISTRY_URL',
                  'value': 'https://192.168.64.9.nip.io/plugin-registry/v3'
                },
                {
                  'name': 'CHE_PLUGIN_REGISTRY_INTERNAL_URL',
                  'value': 'http://plugin-registry.eclipse-che.svc:8080/v3'
                }
              ]
            },
            'attributes': {
              'app.kubernetes.io/component': 'machine-exec',
              'app.kubernetes.io/part-of': 'che-theia.eclipse.org'
            }
          },
          {
            'name': 'remote-runtime-injector',
            'container': {
              'image': 'quay.io/eclipse/che-theia-endpoint-runtime-binary:next',
              'env': [
                {
                  'name': 'PLUGIN_REMOTE_ENDPOINT_EXECUTABLE',
                  'value': '/remote-endpoint/plugin-remote-endpoint'
                },
                {
                  'name': 'REMOTE_ENDPOINT_VOLUME_NAME',
                  'value': 'remote-endpoint'
                },
                {
                  'name': 'CHE_DASHBOARD_URL',
                  'value': 'http://localhost:8080'
                },
                {
                  'name': 'CHE_PLUGIN_REGISTRY_URL',
                  'value': 'https://192.168.64.9.nip.io/plugin-registry/v3'
                },
                {
                  'name': 'CHE_PLUGIN_REGISTRY_INTERNAL_URL',
                  'value': 'http://plugin-registry.eclipse-che.svc:8080/v3'
                }
              ],
              'volumeMounts': [
                {
                  'name': 'plugins',
                  'path': '/plugins'
                },
                {
                  'name': 'remote-endpoint',
                  'path': '/remote-endpoint'
                }
              ],
              'memoryLimit': '128Mi',
              'memoryRequest': '32Mi',
              'cpuLimit': '500m',
              'cpuRequest': '30m'
            },
            'attributes': {
              'app.kubernetes.io/component': 'remote-runtime-injector',
              'app.kubernetes.io/part-of': 'che-theia.eclipse.org'
            }
          },
          {
            'name': 'remote-endpoint',
            'volume': {
              'ephemeral': true
            }
          }
        ]
      } as any
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
    'apiVersion': 'workspace.devfile.io/v1alpha2',
    'kind': 'DevWorkspace',
    'metadata': {
      'name': 'nodejs-mongodb',
      'namespace': 'admin-che',
      'labels': {},
      'uid': ''
    },
    'spec': {
      'started': true,
      'routingClass': 'che',
      'template': {
        'components': [
          {
            'name': 'nodejs',
            'container': {
              'image': 'quay.io/devfile/universal-developer-image:ubi8-b452131',
              'env': [
                {
                  'name': 'SECRET',
                  'value': '220fd770-c028-480d-8f95-f84353c7d55a'
                },
                {
                  'name': 'NODE_ENV',
                  'value': 'production'
                }
              ],
              'endpoints': [
                {
                  'exposure': 'public',
                  'name': 'nodejs',
                  'targetPort': 8080
                }
              ],
              'memoryLimit': '1G',
              'mountSources': true
            }
          },
          {
            'name': 'mongo',
            'container': {
              'image': 'quay.io/eclipse/che--centos--mongodb-36-centos7:latest-a915db7beca87198fcd7860086989fe8a327a1a4f6508025b64ab28fcc7423b2',
              'env': [
                {
                  'name': 'MONGODB_USER',
                  'value': 'user'
                },
                {
                  'name': 'MONGODB_PASSWORD',
                  'value': 'password'
                },
                {
                  'name': 'MONGODB_DATABASE',
                  'value': 'guestbook'
                },
                {
                  'name': 'MONGODB_ADMIN_PASSWORD',
                  'value': 'password'
                }
              ],
              'endpoints': [
                {
                  'name': 'mongodb',
                  'exposure': 'internal',
                  'targetPort': 27017,
                  'attributes': {
                    'discoverable': 'true'
                  }
                }
              ],
              'memoryLimit': '512Mi',
              'mountSources': true,
              'volumeMounts': [
                {
                  'name': 'mongo-storage',
                  'path': '/var/lib/mongodb/data'
                }
              ]
            }
          },
          {
            'name': 'mongo-storage',
            'volume': {
              'size': '1G'
            }
          }
        ],
        'projects': [
          {
            'name': 'nodejs-mongodb-sample',
            'git': {
              'remotes': {
                'origin': 'https://github.com/che-samples/nodejs-mongodb-sample.git'
              },
              'checkoutFrom': {
                'revision': 'devfilev2'
              }
            }
          }
        ],
        'commands': [
          {
            'id': 'runapp',
            'exec': {
              'label': 'Run the application',
              'component': 'nodejs',
              'workingDir': '${PROJECTS_ROOT}/nodejs-mongodb-sample',
              'commandLine': 'npm install && node --inspect=9229 app.js',
              'group': {
                'kind': 'run'
              }
            }
          }
        ]
      }
    }
  } as any
};

export const patchExample = {
  op: 'replace',
  path: '/spec',
  value: {
    'routingClass': 'che',
    'started': true,
    'template': {
      'commands': [
        {
          'exec': {
            'commandLine': 'npm install && node --inspect=9229 app.js',
            'component': 'nodejs',
            'group': {
              'kind': 'run'
            },
            'label': 'Run the application',
            'workingDir': '${PROJECTS_ROOT}/nodejs-mongodb-sample'
          },
          'id': 'runapp'
        }
      ],
      'components': [
        {
          'container': {
            'endpoints': [
              {
                'exposure': 'public',
                'name': 'nodejs',
                'protocol': 'http',
                'targetPort': 8080
              }
            ],
            'env': [
              {
                'name': 'SECRET',
                'value': '220fd770-c028-480d-8f95-f84353c7d55a'
              },
              {
                'name': 'NODE_ENV',
                'value': 'production'
              }
            ],
            'image': 'quay.io/devfile/universal-developer-image:ubi8-b452131',
            'memoryLimit': '1G',
            'mountSources': true,
            'sourceMapping': '/projects'
          },
          'name': 'nodejs'
        },
        {
          'container': {
            'endpoints': [
              {
                'attributes': {
                  'discoverable': 'true'
                },
                'exposure': 'internal',
                'name': 'mongodb',
                'protocol': 'http',
                'targetPort': 27017
              }
            ],
            'env': [
              {
                'name': 'MONGODB_USER',
                'value': 'user'
              },
              {
                'name': 'MONGODB_PASSWORD',
                'value': 'password'
              },
              {
                'name': 'MONGODB_DATABASE',
                'value': 'guestbook'
              },
              {
                'name': 'MONGODB_ADMIN_PASSWORD',
                'value': 'password'
              }
            ],
            'image': 'quay.io/eclipse/che--centos--mongodb-36-centos7:latest-a915db7beca87198fcd7860086989fe8a327a1a4f6508025b64ab28fcc7423b2',
            'memoryLimit': '512Mi',
            'mountSources': true,
            'sourceMapping': '/projects',
            'volumeMounts': [
              {
                'name': 'mongo-storage',
                'path': '/var/lib/mongodb/data'
              }
            ]
          },
          'name': 'mongo'
        },
        {
          'name': 'mongo-storage',
          'volume': {
            'size': '1G'
          }
        },
        {
          'name': 'theia-ide-workspace01e2ddf2213f464f',
          'plugin': {
            'kubernetes': {
              'name': 'theia-ide-workspace01e2ddf2213f464f',
              'namespace': 'admin-che'
            }
          }
        }
      ],
      'projects': [
        {
          'git': {
            'checkoutFrom': {
              'revision': 'devfilev2'
            },
            'remotes': {
              'origin': 'https://github.com/che-samples/nodejs-mongodb-sample.git'
            }
          },
          'name': 'nodejs-mongodb-sample'
        }
      ]
    }
  } as any
};
