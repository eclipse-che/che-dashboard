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

import { DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION } from '@/services/devfileApi/devWorkspace/metadata';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { StorageTypeTitle } from '@/services/storageTypes';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

import { constructWorkspace, WorkspaceAdapter } from '..';

/**
 * @jest-environment node
 */
describe('for DevWorkspace', () => {
  describe('static methods', () => {
    test('buildClusterConsoleUrl', () => {
      const clusterUrl = 'https://cluster.url';
      const namespace = 'test-namespace';
      const workspaceName = 'test-workspace';
      const workspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withNamespace(namespace)
        .build();
      const consoleUrl = WorkspaceAdapter.buildClusterConsoleUrl(workspace, clusterUrl);
      expect(consoleUrl).toEqual(
        `${clusterUrl}/k8s/ns/${namespace}/workspace.devfile.io~v1alpha2~DevWorkspace/${workspaceName}`,
      );
    });
  });

  it('should set "ephemeral" storage type', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace',
    };
    const workspace = constructWorkspace(devWorkspace);

    expect(workspace.storageType).toEqual('per-workspace');

    workspace.storageType = 'ephemeral';

    expect(workspace.storageType).toEqual('ephemeral');
  });

  it('should set "per-workspace" storage type', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'ephemeral',
    };
    const workspace = constructWorkspace(devWorkspace);

    expect(workspace.storageType).toEqual('ephemeral');

    workspace.storageType = 'per-workspace';

    expect(workspace.storageType).toEqual('per-workspace');
  });

  it('should set "per-user" storage type', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace',
    };
    const workspace = constructWorkspace(devWorkspace);

    expect(workspace.storageType).toEqual('per-workspace');

    workspace.storageType = 'per-user';

    expect(workspace.storageType).toEqual('per-user');
  });

  it('should return reference to the workspace', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.ref).toMatchObject(devWorkspace);
  });

  it('should return ID', () => {
    const id = '1234asdf';
    const devWorkspace = new DevWorkspaceBuilder().withId(id).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.id).toEqual(id);
  });

  it('should return UID', () => {
    const id = '1234asdf';
    const devWorkspace = new DevWorkspaceBuilder().withId(id).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.uid).not.toEqual(id);
    expect(workspace.uid).toMatch(/^uid-/);
  });

  it('should return name', () => {
    const name = 'wksp-1234';
    const devWorkspace = new DevWorkspaceBuilder().withName(name).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.name).toEqual(name);
  });

  it('should return namespace', () => {
    const namespace = 'test-namespace';
    const devWorkspace = new DevWorkspaceBuilder().withNamespace(namespace).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.namespace).toEqual(namespace);
  });

  it('should return infrastructure namespace', () => {
    const infrastructureNamespace = 'infrastructure-namespace';
    const devWorkspace = new DevWorkspaceBuilder().withNamespace(infrastructureNamespace).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.infrastructureNamespace).toEqual(infrastructureNamespace);
  });

  it('should return timestamp of creating', () => {
    const timestamp = 1111111;
    const created = new Date(timestamp);
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.metadata.creationTimestamp = created;
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.created).toEqual(timestamp);
  });

  it('should return timestamp of updating', () => {
    const timestamp = 22222222;
    const updated = new Date(timestamp).toISOString();
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.metadata.annotations = {
      [DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION]: updated,
    };
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.updated).toEqual(timestamp);
  });

  it('should return status', () => {
    const status = 'STARTING';
    const devWorkspace = new DevWorkspaceBuilder().withStatus({ phase: status }).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.status).toEqual(DevWorkspaceStatus[status]);
  });

  it('should return ideUrl', () => {
    const ideUrl = 'my/ide/url';
    const devWorkspace = new DevWorkspaceBuilder().withIdeUrl(ideUrl).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.ideUrl).toEqual(ideUrl);
  });

  it('should return Not Defined storage type', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    const workspace = constructWorkspace(devWorkspace);
    expect(StorageTypeTitle[workspace.storageType as '']).toEqual('Not defined');
  });

  it('should return Ephemeral storage type', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'ephemeral',
    };
    const workspace = constructWorkspace(devWorkspace);
    expect(StorageTypeTitle[workspace.storageType as 'ephemeral']).toEqual('Ephemeral');
  });

  it('should return Per-user storage type', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-user',
    };
    const workspace = constructWorkspace(devWorkspace);
    expect(StorageTypeTitle[workspace.storageType as 'per-user']).toEqual('Per-user');
  });

  it('should return Per-workspace storage type', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace',
    };
    const workspace = constructWorkspace(devWorkspace);
    expect(StorageTypeTitle[workspace.storageType as 'per-workspace']).toEqual('Per-workspace');
  });

  it('should return list of project names', () => {
    const projects = [
      {
        name: 'My first project',
        git: {
          remotes: {
            origin: 'first/project/location',
          },
        },
      },
      {
        name: 'My second project',
        git: {
          remotes: {
            origin: 'second/project/location',
          },
        },
      },
    ];
    const devWorkspace = new DevWorkspaceBuilder().withProjects(projects).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.projects).toEqual([projects[0].name, projects[1].name]);
  });
});
