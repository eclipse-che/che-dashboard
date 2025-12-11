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

import { dump } from 'js-yaml';

import { DEVWORKSPACE_UPDATING_TIMESTAMP_ANNOTATION } from '@/services/devfileApi/devWorkspace/metadata';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { StorageTypeTitle } from '@/services/storageTypes';
import {
  DEVWORKSPACE_DEVFILE_SOURCE,
  DEVWORKSPACE_LABEL_METADATA_NAME,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
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

  it('should remove storage type when set to empty string', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace',
    };
    const workspace = constructWorkspace(devWorkspace);

    expect(workspace.storageType).toEqual('per-workspace');

    // Test edge case: set storageType to falsy value to trigger removal
    workspace.storageType = undefined as any;

    expect(workspace.storageType).toEqual('');
    expect(
      workspace.ref.spec.template.attributes?.[DEVWORKSPACE_STORAGE_TYPE_ATTR],
    ).toBeUndefined();
  });

  it('should remove attributes object when clearing storage type and attributes become empty', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template.attributes = {
      [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace',
    };
    const workspace = constructWorkspace(devWorkspace);

    // Test edge case: set storageType to falsy value to trigger removal
    workspace.storageType = undefined as any;

    expect(workspace.ref.spec.template.attributes).toBeUndefined();
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

  it('should return name from the "metadata.name"', () => {
    const name = 'wksp-1234';
    const devWorkspace = new DevWorkspaceBuilder().withName(name).build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.name).toEqual(name);
  });

  it('should return name from the "kubernetes.io/metadata.name" label', () => {
    const name = 'wksp-1234';
    const overrideName = 'override-name';
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: overrideName,
        },
        name,
      })
      .build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.name).not.toEqual(name);
    expect(workspace.name).toEqual(overrideName);
  });

  it('should set workspace name in "kubernetes.io/metadata.name" label', () => {
    const name = 'wksp-1234';
    const newName = 'new-workspace-name';
    const devWorkspace = new DevWorkspaceBuilder().withName(name).build();
    const workspace = constructWorkspace(devWorkspace);

    expect(workspace.name).toEqual(name);

    workspace.name = newName;

    expect(workspace.name).toEqual(newName);
    expect(workspace.ref.metadata.labels?.[DEVWORKSPACE_LABEL_METADATA_NAME]).toEqual(newName);
  });

  it('should update workspace name when label already exists', () => {
    const name = 'wksp-1234';
    const initialOverrideName = 'initial-override';
    const newName = 'updated-name';
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: initialOverrideName,
        },
        name,
      })
      .build();
    const workspace = constructWorkspace(devWorkspace);

    expect(workspace.name).toEqual(initialOverrideName);

    workspace.name = newName;

    expect(workspace.name).toEqual(newName);
    expect(workspace.ref.metadata.labels?.[DEVWORKSPACE_LABEL_METADATA_NAME]).toEqual(newName);
  });

  it('should remove workspace name label when set to empty string', () => {
    const name = 'wksp-1234';
    const overrideName = 'override-name';
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: overrideName,
        },
        name,
      })
      .build();
    const workspace = constructWorkspace(devWorkspace);

    expect(workspace.name).toEqual(overrideName);

    workspace.name = '';

    expect(workspace.name).toEqual(name);
    expect(workspace.ref.metadata.labels?.[DEVWORKSPACE_LABEL_METADATA_NAME]).toBeUndefined();
  });

  it('should remove labels object when clearing name and labels become empty', () => {
    const name = 'wksp-1234';
    const overrideName = 'override-name';
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        labels: {
          [DEVWORKSPACE_LABEL_METADATA_NAME]: overrideName,
        },
        name,
      })
      .build();
    const workspace = constructWorkspace(devWorkspace);

    workspace.name = '';

    expect(workspace.ref.metadata.labels).toBeUndefined();
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

  it('should return empty array when no projects and no starter projects', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.projects).toEqual([]);
  });

  it('should return starter project name when use-starter-project attribute is set', () => {
    const starterProjectName = 'my-starter-project';
    const devWorkspace = new DevWorkspaceBuilder()
      .withSpec({
        template: {
          attributes: {
            'controller.devfile.io/use-starter-project': starterProjectName,
          },
          starterProjects: [
            {
              name: starterProjectName,
              git: {
                remotes: {
                  origin: 'https://github.com/user/repo.git',
                },
              },
            },
          ],
        },
      })
      .build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.projects).toEqual([starterProjectName]);
  });

  it('should return empty array when starter project name does not match', () => {
    const starterProjectName = 'my-starter-project';
    const devWorkspace = new DevWorkspaceBuilder()
      .withSpec({
        template: {
          attributes: {
            'controller.devfile.io/use-starter-project': starterProjectName,
          },
          starterProjects: [
            {
              name: 'different-starter-project',
              git: {
                remotes: {
                  origin: 'https://github.com/user/repo.git',
                },
              },
            },
          ],
        },
      })
      .build();
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.projects).toEqual([]);
  });

  it('should return empty array when template is undefined', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();
    devWorkspace.spec.template = undefined as any;
    const workspace = constructWorkspace(devWorkspace);
    expect(workspace.projects).toEqual([]);
  });

  describe('source', () => {
    it('should return undefined if devfile source is not define', () => {
      const devWorkspace = new DevWorkspaceBuilder().build();
      const workspace = constructWorkspace(devWorkspace);
      expect(workspace.source).toBeUndefined();
    });

    describe('factory params', () => {
      it('should return factory url with all params (including factory attributes)', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'che-editor=che-incubator/che-code/latest&storageType=per-workspace&url=https://github.com/user/repo',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual(
          'https://github.com/user/repo?che-editor=che-incubator/che-code/latest&storageType=per-workspace',
        );
      });

      it('should return factory url without non-propagated params', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=https://github.com/user/repo',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual('https://github.com/user/repo');
      });

      it('should handle factory params with che-editor only', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'che-editor=che-code&url=https://gitlab.com/project/repo',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual('https://gitlab.com/project/repo?che-editor=che-code');
      });

      it('should handle factory params with multiple propagated attributes', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'che-editor=che-incubator/che-idea/latest&image=custom-image:tag&policies.create=peruser&storageType=ephemeral&url=https://bitbucket.org/team/project',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // Should include all propagated factory attributes
        expect(workspace.source).toContain('che-editor=che-incubator/che-idea/latest');
        expect(workspace.source).toContain('image=custom-image:tag');
        expect(workspace.source).toContain('policies.create=peruser');
        expect(workspace.source).toContain('storageType=ephemeral');
        expect(workspace.source).toContain('https://bitbucket.org/team/project');
      });

      it('should handle airgap sample URLs with propagated attributes', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'che-editor=che-incubator/che-code/latest&storageType=per-user&url=http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-maven',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual(
          'http://localhost:8080/dashboard/api/airgap-sample/devfile/download?id=java-maven&che-editor=che-incubator/che-code/latest&storageType=per-user',
        );
      });

      it('should return base URL when no propagated params present', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=https://github.com/eclipse-che/che-dashboard',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual('https://github.com/eclipse-che/che-dashboard');
      });

      it('should handle legacy factory params format', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'editor-image=test-images/che-code:tag&url=https://dummy.repo',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // Should include the editor-image param (it's a propagated attribute)
        expect(workspace.source).toEqual(
          'https://dummy.repo?editor-image=test-images/che-code:tag',
        );
      });

      it('should not include "existing" param in source', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'che-editor=che-code&existing=some-workspace&url=https://github.com/user/repo',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // "existing" should not be in source (it's flow control, not source identification)
        expect(workspace.source).toEqual('https://github.com/user/repo?che-editor=che-code');
        expect(workspace.source).not.toContain('existing=');
      });

      it('should return undefined when factory params array is empty', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: '',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toBeUndefined();
      });

      it('should return undefined when factory params do not contain url param', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'che-editor=che-code&storageType=per-workspace',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toBeUndefined();
      });

      it('should handle URL with existing query params', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'che-editor=che-code&url=https://github.com/user/repo?branch=main&path=/src',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toContain('https://github.com/user/repo?branch=main&path=/src');
        expect(workspace.source).toContain('che-editor=che-code');
      });
    });

    it('should return scm repo if existing', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'test-workspace',
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              scm: {
                repo: 'https://dummy.repo.git',
              },
            }),
          },
        })
        .build();
      const workspace = constructWorkspace(devWorkspace);
      expect(workspace.source).toEqual('https://dummy.repo.git');
    });
    it('should return url location if existing', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'test-workspace',
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              url: {
                location: 'https://dummy.repo/devfile.yaml',
              },
            }),
          },
        })
        .build();
      const workspace = constructWorkspace(devWorkspace);
      expect(workspace.source).toEqual('https://dummy.repo/devfile.yaml');
    });
  });
});
