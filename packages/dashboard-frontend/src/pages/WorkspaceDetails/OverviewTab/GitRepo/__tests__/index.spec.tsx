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

import userEvent from '@testing-library/user-event';
import { dump } from 'js-yaml';
import React from 'react';

import GitRepoFormGroup from '@/pages/WorkspaceDetails/OverviewTab/GitRepo';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DEVWORKSPACE_DEVFILE_SOURCE } from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

// mute the outputs
console.error = jest.fn();

const mockClipboard = jest.fn();
jest.mock('react-copy-to-clipboard', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      return (
        <button
          onClick={() => {
            mockClipboard(props.text);
            props.onCopy();
          }}
        >
          Copy to clipboard
        </button>
      );
    },
  };
});

describe('GitRepoURL', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('screenshot when factory params is not available', () => {
    const devWorkspace = new DevWorkspaceBuilder().build();

    const snapshot = createSnapshot(constructWorkspace(devWorkspace));

    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('screenshot when factory params is available', () => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        name: 'test-workspace',
        annotations: {
          [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
            factory: {
              params:
                'editor-image=test-images/che-code:tag&url=https://github.com/eclipse-che/che-dashboard',
            },
          }),
        },
      })
      .build();

    const snapshot = createSnapshot(constructWorkspace(devWorkspace));

    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('copy to clipboard', async () => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        name: 'test-workspace',
        annotations: {
          [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
            factory: {
              params:
                'editor-image=test-images/che-code:tag&url=https://github.com/eclipse-che/che-dashboard',
            },
          }),
        },
      })
      .build();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockCreateObjectURL = jest.fn().mockReturnValue('blob-url');
    URL.createObjectURL = mockCreateObjectURL;

    renderComponent(constructWorkspace(devWorkspace));

    const copyButtonName = 'Copy to clipboard';
    expect(screen.queryByRole('button', { name: copyButtonName })).toBeTruthy;

    const copyButton = screen.getByRole('button', { name: copyButtonName });
    await user.click(copyButton);

    expect(mockClipboard).toHaveBeenCalledWith(
      'https://github.com/eclipse-che/che-dashboard?editor-image=test-images/che-code:tag',
    );

    /* 'Copy to clipboard' should be hidden for a while */

    expect(screen.queryByRole('button', { name: copyButtonName })).toBeFalsy;

    const copyButtonNameAfter = 'Copied';
    expect(screen.queryByRole('button', { name: copyButtonNameAfter })).toBeTruthy;

    /* 'Copy to clipboard' should re-appear after 3000ms */

    jest.advanceTimersByTime(4000);
    expect(screen.queryByRole('button', { name: copyButtonName })).toBeTruthy;
    expect(screen.queryByRole('button', { name: copyButtonNameAfter })).toBeFalsy;
  });

  describe('getSource method', () => {
    let component: GitRepoFormGroup;

    beforeEach(() => {
      component = new GitRepoFormGroup({
        workspace: constructWorkspace(new DevWorkspaceBuilder().build()),
      });
    });

    test('should return empty source when workspace.source is undefined', () => {
      const devWorkspace = new DevWorkspaceBuilder().build();
      const source = component.getSource(devWorkspace);

      expect(source.gitRepo).toBe('');
      expect(source.fieldName).toBe('');
      expect(source.isUrl).toBe(false);
    });

    test('should handle HTTP URL with factory params', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params:
                  'storageType=per-user&che-editor=che-code/latest&url=https://github.com/user/repo',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.gitRepo).toContain('https://github.com/user/repo');
      expect(source.gitRepo).toContain('storageType=per-user');
      expect(source.gitRepo).toContain('che-editor=che-code/latest');
      expect(source.fieldName).toBe('user/repo');
    });

    test('should handle HTTPS URL with multiple factory params', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params:
                  'editor-image=test-image:tag&storageType=ephemeral&url=https://github.com/eclipse-che/che-dashboard/tree/main',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.gitRepo).toContain('https://github.com/eclipse-che/che-dashboard/tree/main');
      expect(source.fieldName).toBe('eclipse-che/che-dashboard/tree/main');
    });

    test('should handle SCM repo source', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              scm: {
                repo: 'https://github.com/user/repo',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.gitRepo).toBe('https://github.com/user/repo');
      expect(source.fieldName).toBe('user/repo');
    });

    test('should handle URL location source', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              url: {
                location: 'https://raw.githubusercontent.com/user/repo/main/devfile.yaml',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.gitRepo).toBe('https://raw.githubusercontent.com/user/repo/main/devfile.yaml');
      expect(source.fieldName).toBe('user/repo/main/devfile.yaml');
    });

    test('should truncate long fieldName to 50 characters', () => {
      const longPath = 'a'.repeat(60);
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: `url=https://github.com/user/repo/tree/${longPath}`,
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.fieldName.length).toBe(53); // 50 + '...'
      expect(source.fieldName.endsWith('...')).toBe(true);
    });

    test('should handle URL with root pathname (returns empty string)', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=https://github.com',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.gitRepo).toContain('https://github.com');
      // When pathname is root (/), replace(/^\//, '') returns empty string
      expect(source.fieldName).toBe('');
    });

    test('should handle non-URL source (SSH location)', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              scm: {
                repo: 'git@github.com:user/repo.git',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(false);
      expect(source.gitRepo).toBe('git@github.com:user/repo.git');
      expect(source.fieldName).toBe('git@github.com:user/repo.git');
    });

    test('should handle non-HTTP URL that passes isHttpLocation check', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=http://internal-server:8080/repo',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.gitRepo).toContain('http://internal-server:8080/repo');
      expect(source.fieldName).toBe('repo');
    });

    test('should exclude existing and url params from propagated attributes', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params:
                  'existing=workspace-name&url=https://github.com/user/repo&storageType=per-user&che-editor=che-code',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.gitRepo).toContain('https://github.com/user/repo');
      expect(source.gitRepo).toContain('storageType=per-user');
      expect(source.gitRepo).toContain('che-editor=che-code');
      // Should not contain 'existing' param
      expect(source.gitRepo).not.toContain('existing=');
      // Should not contain 'url=' param
      expect(source.gitRepo).not.toContain('url=');
    });

    test('should sort factory params alphabetically', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params:
                  'url=https://github.com/user/repo&storageType=per-user&che-editor=che-code&editor-image=test:tag',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      // Params should be sorted alphabetically
      const urlIndex = source.gitRepo.indexOf('https://github.com/user/repo');
      const cheEditorIndex = source.gitRepo.indexOf('che-editor=');
      const editorImageIndex = source.gitRepo.indexOf('editor-image=');
      const storageTypeIndex = source.gitRepo.indexOf('storageType=');

      expect(urlIndex).toBeLessThan(cheEditorIndex);
      expect(cheEditorIndex).toBeLessThan(editorImageIndex);
      expect(editorImageIndex).toBeLessThan(storageTypeIndex);
    });

    test('should handle URL with query parameters in pathname', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=https://github.com/user/repo?branch=main&path=src',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.gitRepo).toContain('https://github.com/user/repo');
      // fieldName should be extracted from pathname (before query params)
      expect(source.fieldName).toBe('user/repo');
    });

    test('should handle URL with deep path', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=https://github.com/org/project/tree/main/src/components',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.fieldName).toBe('org/project/tree/main/src/components');
    });

    test('should handle empty source string', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.gitRepo).toBe('');
      expect(source.fieldName).toBe('');
      expect(source.isUrl).toBe(false);
    });

    test('should handle URL with trailing slash', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              factory: {
                params: 'url=https://github.com/user/repo/',
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(true);
      expect(source.fieldName).toBe('user/repo/');
    });

    test('should truncate non-HTTP source fieldName to 50 characters', () => {
      const longSshPath = 'a'.repeat(60);
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          annotations: {
            [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
              scm: {
                repo: `git@github.com:user/${longSshPath}.git`,
              },
            }),
          },
        })
        .build();
      const source = component.getSource(devWorkspace);

      expect(source.isUrl).toBe(false);
      expect(source.fieldName.length).toBe(53); // 50 + '...'
      expect(source.fieldName.endsWith('...')).toBe(true);
    });
  });
});

function getComponent(workspace: Workspace) {
  return <GitRepoFormGroup workspace={workspace} />;
}
