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

import { dump } from 'js-yaml';

import {
  checkCreateFlow,
  checkFactoryFlow,
} from '@/components/WorkspaceProgress/CommonSteps/CheckRunningWorkspacesLimit/helpers';
import { buildFactoryLocation, buildIdeLoaderLocation } from '@/services/helpers/location';
import { constructWorkspace } from '@/services/workspace-adapter';
import { DEVWORKSPACE_DEVFILE_SOURCE } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

describe('helpers', () => {
  test('checkFactoryFlow', async () => {
    const factoryLocation = buildFactoryLocation();
    factoryLocation.search = '?url=http://dummy-repo123';

    expect(factoryLocation.pathname).toEqual('/load-factory');
    expect(factoryLocation.search).toEqual('?url=http://dummy-repo123');

    let isFactoryFlow = checkFactoryFlow(factoryLocation);

    expect(isFactoryFlow).toBeTruthy();

    const devWorkspace = new DevWorkspaceBuilder()
      .withName('dummy-wrks')
      .withNamespace('dummy-namespace')
      .build();
    const workspace = constructWorkspace(devWorkspace);
    const ideLoaderLocation = buildIdeLoaderLocation(workspace);
    ideLoaderLocation.search = '?url=http://dummy-repo456';

    expect(ideLoaderLocation.pathname).toEqual('/ide/dummy-namespace/dummy-wrks');
    expect(ideLoaderLocation.search).toEqual('?url=http://dummy-repo456');

    isFactoryFlow = checkFactoryFlow(ideLoaderLocation);

    expect(isFactoryFlow).toBeFalsy();
  });

  test('checkCreateFlow', async () => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        annotations: {
          [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
            factory: {
              params: 'url=http://dummy-repo',
            },
          }),
        },
        namespace: 'dummy-namespace',
        name: 'dummy-wrks',
      })
      .build();
    const workspace = constructWorkspace(devWorkspace);
    const ideLoaderLocation = buildIdeLoaderLocation(workspace);
    ideLoaderLocation.search = '?url=http://dummy-repo456';

    let isCreateFlow = checkCreateFlow(ideLoaderLocation, [workspace]);

    expect(isCreateFlow).toBeFalsy();

    const factoryLocation = buildFactoryLocation();
    factoryLocation.search = '?url=http://dummy-repo123&policies.create=perclick';

    isCreateFlow = checkCreateFlow(factoryLocation, [workspace]);

    expect(isCreateFlow).toBeTruthy();

    factoryLocation.search = '?url=http://dummy-repo';

    isCreateFlow = checkCreateFlow(factoryLocation, [workspace]);

    expect(isCreateFlow).toBeFalsy();

    workspace.ref.metadata.annotations![DEVWORKSPACE_DEVFILE_SOURCE] = '';

    isCreateFlow = checkCreateFlow(factoryLocation, [workspace]);

    expect(isCreateFlow).toBeTruthy();
  });
});
