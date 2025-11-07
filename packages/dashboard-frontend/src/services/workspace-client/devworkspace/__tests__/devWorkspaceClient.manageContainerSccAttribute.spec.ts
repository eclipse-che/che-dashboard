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

import { api } from '@eclipse-che/common';
import mockAxios from 'axios';

import { container } from '@/inversify.config';
import * as DwApi from '@/services/backend-client/devWorkspaceApi';
import devfileApi from '@/services/devfileApi';
import { DevWorkspaceClient } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

describe('DevWorkspace client', () => {
  let client: DevWorkspaceClient;
  let spyPatchWorkspace: jest.SpyInstance;

  beforeEach(() => {
    mockAxios.get = jest.fn();
    client = container.get(DevWorkspaceClient);

    spyPatchWorkspace = jest
      .spyOn(DwApi, 'patchWorkspace')
      .mockResolvedValue({ devWorkspace: {} as devfileApi.DevWorkspace, headers: {} });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Add attribute, add env var[s]', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {},
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'add',
        path: '/spec/template/attributes/controller.devfile.io~1scc',
        value: 'container-run',
      },
      {
        op: 'add',
        path: '/spec/template/components/0/container/env',
        value: [{ name: 'HOST_USERS', value: 'false' }],
      },
    ]);
  });

  it('Add attribute[s], add env var[s]', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'add',
        path: '/spec/template/attributes',
        value: { 'controller.devfile.io/scc': 'container-run' },
      },
      {
        op: 'add',
        path: '/spec/template/components/0/container/env',
        value: [{ name: 'HOST_USERS', value: 'false' }],
      },
    ]);
  });

  it('Keep attribute, keep env var', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {
          'controller.devfile.io/scc': 'container-run',
        },
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
              env: [{ name: 'HOST_USERS', value: 'false' }],
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).not.toHaveBeenCalled();
  });

  it('Update attribute, update env var because scc does not match', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {
          'controller.devfile.io/scc': 'unknown-scc',
        },
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
              env: [{ name: 'HOST_USERS', value: 'unknown-host-users' }],
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'replace',
        path: '/spec/template/attributes/controller.devfile.io~1scc',
        value: 'container-run',
      },
      {
        op: 'replace',
        path: '/spec/template/components/0/container/env/0',
        value: { name: 'HOST_USERS', value: 'false' },
      },
    ]);
  });

  it('Keep attribute, add env var', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {
          'controller.devfile.io/scc': 'container-run',
        },
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
              env: [],
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'add',
        path: '/spec/template/components/0/container/env/-',
        value: { name: 'HOST_USERS', value: 'false' },
      },
    ]);
  });

  it('Keep attribute, add env var[s]', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {
          'controller.devfile.io/scc': 'container-run',
        },
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'add',
        path: '/spec/template/components/0/container/env',
        value: [{ name: 'HOST_USERS', value: 'false' }],
      },
    ]);
  });

  it('Keep attribute, replace env var', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: false,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {
          'controller.devfile.io/scc': 'container-run',
        },
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
              env: [{ name: 'HOST_USERS', value: 'true' }],
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'replace',
        path: '/spec/template/components/0/container/env/0',
        value: { name: 'HOST_USERS', value: 'false' },
      },
    ]);
  });

  it('Switch from run capabilities to build capabilities', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: true,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
      containerBuild: {
        disableContainerBuildCapabilities: false,
        containerBuildConfiguration: { openShiftSecurityContextConstraint: 'container-build' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {
          'controller.devfile.io/scc': 'container-run',
        },
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
              env: [{ name: 'HOST_USERS', value: 'false' }],
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'replace',
        path: '/spec/template/attributes/controller.devfile.io~1scc',
        value: 'container-build',
      },
      {
        op: 'replace',
        path: '/spec/template/components/0/container/env/0',
        value: { name: 'HOST_USERS', value: 'true' },
      },
    ]);
  });

  it('Delete attribute, delete env var', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: true,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
      containerBuild: {
        disableContainerBuildCapabilities: true,
        containerBuildConfiguration: { openShiftSecurityContextConstraint: 'container-build' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        attributes: {
          'controller.devfile.io/scc': 'container-run',
        },
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
              env: [{ name: 'HOST_USERS', value: 'false' }],
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).toHaveBeenCalledWith(namespace, name, [
      {
        op: 'remove',
        path: '/spec/template/attributes/controller.devfile.io~1scc',
      },
      {
        op: 'remove',
        path: '/spec/template/components/0/container/env/0',
      },
    ]);
  });

  it('Attribute already deleted, env var already deleted', async () => {
    const config = {
      containerRun: {
        disableContainerRunCapabilities: true,
        containerRunConfiguration: { openShiftSecurityContextConstraint: 'container-run' },
      },
      containerBuild: {
        disableContainerBuildCapabilities: true,
        containerBuildConfiguration: { openShiftSecurityContextConstraint: 'container-build' },
      },
    } as api.IServerConfig;

    const namespace = 'test';
    const name = 'wksp-test';
    const workspace = new DevWorkspaceBuilder()
      .withName(name)
      .withNamespace(namespace)
      .withTemplate({
        components: [
          {
            name: 'universal-developer-image',
            container: {
              image: 'quay.io/devfile/universal-developer-image:ubi8-latest',
            },
          },
        ],
      })
      .build();

    await client.manageContainerSccAttribute(workspace, config);
    expect(spyPatchWorkspace).not.toHaveBeenCalled();
  });
});
