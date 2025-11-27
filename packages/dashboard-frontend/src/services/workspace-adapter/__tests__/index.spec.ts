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

  describe('source', () => {
    it('should return undefined if devfile source is not define', () => {
      const devWorkspace = new DevWorkspaceBuilder().build();
      const workspace = constructWorkspace(devWorkspace);
      expect(workspace.source).toBeUndefined();
    });

    describe('factory params handling', () => {
      it('should return factory url param if existing', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'che-editor=che-incubator/che-code/latest&storageType=per-workspace&url=dummy.repo?id=java-lombok',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual(
          'dummy.repo?id=java-lombok&che-editor=che-incubator/che-code/latest&storageType=per-workspace',
        );
      });

      it('should propagate factory attributes in sorted order', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'url=https://github.com/test/repo&storageType=ephemeral&che-editor=che-code/latest&devWorkspace=myspace',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // Attributes should be sorted alphabetically
        expect(workspace.source).toEqual(
          'https://github.com/test/repo?che-editor=che-code/latest&devWorkspace=myspace&storageType=ephemeral',
        );
      });

      it('should handle url with existing query parameters', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'url=https://repo.test?param1=value1&storageType=per-user&che-editor=code',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual(
          'https://repo.test?param1=value1&che-editor=code&storageType=per-user',
        );
      });

      it('should handle url without protocol', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=github.com/user/repo&che-editor=code',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        expect(workspace.source).toEqual('github.com/user/repo?che-editor=code');
      });

      it('should only propagate attributes from PROPAGATE_FACTORY_ATTRS list', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params:
                    'url=https://github.com/test/repo&storageType=ephemeral&unknownParam=value&che-editor=code',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // unknownParam should not be propagated
        expect(workspace.source).not.toContain('unknownParam');
        expect(workspace.source).toEqual(
          'https://github.com/test/repo?che-editor=code&storageType=ephemeral',
        );
      });
    });

    describe('SSH location revision handling', () => {
      it('should extract revision from git projects for SSH location', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=git@github.com:user/repo.git&storageType=per-workspace',
                },
              }),
            },
          })
          .withProjects([
            {
              name: 'test-project',
              git: {
                remotes: {
                  origin: 'git@github.com:user/repo.git',
                },
                checkoutFrom: {
                  revision: 'feature-branch',
                },
              },
            },
          ])
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // For SSH, revision should be extracted from git projects and appended after propagated attrs
        expect(workspace.source).toEqual(
          'git@github.com:user/repo.git?storageType=per-workspace&revision=feature-branch',
        );
      });

      it('should not extract revision for SSH if already in params', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=git@github.com:user/repo.git&revision=main&storageType=per-user',
                },
              }),
            },
          })
          .withProjects([
            {
              name: 'test-project',
              git: {
                remotes: {
                  origin: 'git@github.com:user/repo.git',
                },
                checkoutFrom: {
                  revision: 'feature-branch',
                },
              },
            },
          ])
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // Should use revision from params, not from project
        expect(workspace.source).toEqual(
          'git@github.com:user/repo.git?revision=main&storageType=per-user',
        );
      });

      it('should not extract revision from git projects for HTTP location', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=https://github.com/user/repo.git&storageType=ephemeral',
                },
              }),
            },
          })
          .withProjects([
            {
              name: 'test-project',
              git: {
                remotes: {
                  origin: 'https://github.com/user/repo.git',
                },
                checkoutFrom: {
                  revision: 'feature-branch',
                },
              },
            },
          ])
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // HTTP location should NOT extract revision from projects
        expect(workspace.source).not.toContain('revision=feature-branch');
        expect(workspace.source).toEqual('https://github.com/user/repo.git?storageType=ephemeral');
      });

      it('should not extract revision from git projects for HTTPS location', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=https://gitlab.com/user/repo.git',
                },
              }),
            },
          })
          .withProjects([
            {
              name: 'test-project',
              git: {
                remotes: {
                  origin: 'https://gitlab.com/user/repo.git',
                },
                checkoutFrom: {
                  revision: 'develop',
                },
              },
            },
          ])
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // HTTPS location should NOT extract revision from projects
        expect(workspace.source).not.toContain('revision=develop');
        expect(workspace.source).toEqual('https://gitlab.com/user/repo.git');
      });

      it('should handle SSH location without projects', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=ssh://git@bitbucket.org:user/repo.git&storageType=per-user',
                },
              }),
            },
          })
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // No projects, so no revision to extract
        expect(workspace.source).toEqual(
          'ssh://git@bitbucket.org:user/repo.git?storageType=per-user',
        );
      });

      it('should handle SSH location with empty checkoutFrom', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                factory: {
                  params: 'url=git@gitlab.com:user/repo.git',
                },
              }),
            },
          })
          .withProjects([
            {
              name: 'test-project',
              git: {
                remotes: {
                  origin: 'git@gitlab.com:user/repo.git',
                },
              },
            },
          ])
          .build();
        const workspace = constructWorkspace(devWorkspace);
        // No checkoutFrom, so no revision
        expect(workspace.source).toEqual('git@gitlab.com:user/repo.git');
      });

      it('should handle various SSH URL formats', () => {
        const testCases = [
          {
            url: 'user@repository.example.com:/home/user/repo.git',
            revision: 'develop',
            expected: 'user@repository.example.com:/home/user/repo.git?revision=develop',
          },
          {
            url: 'ssh://azuredevops.user.prv:22/tfs/collection/tools/git/ocp.gitops',
            revision: 'main',
            expected:
              'ssh://azuredevops.user.prv:22/tfs/collection/tools/git/ocp.gitops?revision=main',
          },
          {
            url: 'ssh://git@github.com:2222/user/repo.git',
            revision: 'feature-1',
            expected: 'ssh://git@github.com:2222/user/repo.git?revision=feature-1',
          },
        ];

        testCases.forEach(({ url, revision, expected }) => {
          const devWorkspace = new DevWorkspaceBuilder()
            .withMetadata({
              name: 'test-workspace',
              annotations: {
                [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
                  factory: {
                    params: `url=${url}`,
                  },
                }),
              },
            })
            .withProjects([
              {
                name: 'test-project',
                git: {
                  remotes: { origin: url },
                  checkoutFrom: { revision },
                },
              },
            ])
            .build();
          const workspace = constructWorkspace(devWorkspace);
          expect(workspace.source).toEqual(expected);
        });
      });
    });

    describe('non-factory sources', () => {
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
});
