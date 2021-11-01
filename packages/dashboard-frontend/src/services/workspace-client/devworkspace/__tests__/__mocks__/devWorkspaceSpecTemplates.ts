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

import {
  V1alpha2DevWorkspaceSpecTemplate,
  V1alpha2DevWorkspaceSpecTemplateCommandsItemsExecGroup,
  V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerEndpoints,
} from '@devfile/api';
import KindEnum = V1alpha2DevWorkspaceSpecTemplateCommandsItemsExecGroup.KindEnum;
import ExposureEnum = V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerEndpoints.ExposureEnum;
import ProtocolEnum = V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainerEndpoints.ProtocolEnum;

const namespace = 'test-namespace';

const template: V1alpha2DevWorkspaceSpecTemplate = {
  commands: [
    {
      exec: {
        commandLine: 'npm install',
        component: 'nodejs',
        group: {
          isDefault: true,
          kind: KindEnum.Build,
        },
        label: 'Download dependencies',
        workingDir: '${PROJECTS_ROOT}/web-nodejs-sample/app',
      },
      id: 'dependencies',
    },
    {
      exec: {
        commandLine: 'nodemon app.js',
        component: 'nodejs',
        group: {
          kind: KindEnum.Run,
        },
        label: 'Run the web app',
        workingDir: '${PROJECTS_ROOT}/web-nodejs-sample/app',
      },
      id: 'runapp',
    },
    {
      exec: {
        commandLine: 'nodemon --inspect app.js',
        component: 'nodejs',
        group: {
          isDefault: true,
          kind: KindEnum.Debug,
        },
        label: 'Run the web app (debugging enabled)',
        workingDir: '${PROJECTS_ROOT}/web-nodejs-sample/app',
      },
      id: 'debug',
    },
    {
      exec: {
        commandLine:
          'node_server_pids=$(pgrep -fx \'.*nodemon (--inspect )?app.js\' | tr "\\\\n" " ") && echo "Stopping node server with PIDs: ${node_server_pids}" &&  kill -15 ${node_server_pids} &>/dev/null && echo \'Done.\'',
        component: 'nodejs',
        group: {
          kind: KindEnum.Run,
        },
        label: 'Stop the web app',
      },
      id: 'stopapp',
    },
  ],
  components: [
    {
      attributes: {
        'app.kubernetes.io/name': 'nodejs',
        'che-theia.eclipse.org/vscode-extensions': [
          'https://open-vsx.org/api/vscode/typescript-language-features/1.49.3/file/vscode.typescript-language-features-1.49.3.vsix',
          'https://open-vsx.org/api/ms-vscode/js-debug/1.52.2/file/ms-vscode.js-debug-1.52.2.vsix',
        ],
      },
      container: {
        args: ['sh', '-c', '${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}'],
        endpoints: [
          {
            exposure: ExposureEnum.Public,
            name: 'nodejs',
            protocol: ProtocolEnum.Http,
            targetPort: 3000,
          },
        ],
        env: [
          {
            name: 'PLUGIN_REMOTE_ENDPOINT_EXECUTABLE',
            value: '/remote-endpoint/plugin-remote-endpoint',
          },
          {
            name: 'THEIA_PLUGINS',
            value: 'local-dir:///plugins/sidecars/nodejs',
          },
        ],
        image: 'quay.io/devfile/universal-developer-image:ubi8-b452131',
        memoryLimit: '1G',
        mountSources: true,
        sourceMapping: '/projects',
        volumeMounts: [
          {
            name: 'remote-endpoint',
            path: '/remote-endpoint',
          },
          {
            name: 'plugins',
            path: '/plugins',
          },
        ],
      },
      name: 'nodejs',
    },
    {
      name: 'theia-ide-workspace189007441fb54fb9',
      plugin: {
        kubernetes: {
          name: 'theia-ide-workspace189007441fb54fb9',
          namespace,
        },
      },
    },
  ],
  projects: [
    {
      git: {
        checkoutFrom: {
          revision: 'devfilev2',
        },
        remotes: {
          origin: 'https://github.com/che-samples/web-nodejs-sample.git',
        },
      },
      name: 'web-nodejs-sample',
    },
  ],
};

export default template;
