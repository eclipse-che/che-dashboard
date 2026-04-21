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

import {
  EDITORS_WITHOUT_BINARIES,
  hasDownloadBinaries,
} from '@/components/WorkspaceProgress/StartingSteps/WorkspaceConditions/helpers';
import { DEVWORKSPACE_CHE_EDITOR } from '@/services/devfileApi/devWorkspace/metadata';
import { constructWorkspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

describe('hasDownloadBinaries', () => {
  let devWorkspaceBuilder: DevWorkspaceBuilder;

  beforeAll(() => {
    devWorkspaceBuilder = new DevWorkspaceBuilder();
  });

  it('should return false', () => {
    const name = 'test';
    const namespace = 'che-user';
    const editorId = 'che-incubator/che-code/latest';
    const workspaceWithEditorId = constructWorkspace(
      devWorkspaceBuilder
        .withMetadata({
          name,
          namespace,
          annotations: {
            [DEVWORKSPACE_CHE_EDITOR]: editorId,
          },
        })
        .build(),
    );

    // if workspaces list is empty
    expect(hasDownloadBinaries([], { namespace, workspaceName: name })).toEqual(false);
    // if namespace is undefined
    expect(
      hasDownloadBinaries([workspaceWithEditorId], { namespace: undefined, workspaceName: name }),
    ).toEqual(false);
    // if workspaceName is undefined
    expect(
      hasDownloadBinaries([workspaceWithEditorId], { namespace, workspaceName: undefined }),
    ).toEqual(false);
    // skip if no target workspace found (wrong namespace)
    expect(
      hasDownloadBinaries([workspaceWithEditorId], {
        namespace: 'wrong-namespace',
        workspaceName: name,
      }),
    ).toEqual(false);
    // skip if no target workspace found (wrong name)
    expect(
      hasDownloadBinaries([workspaceWithEditorId], { namespace, workspaceName: 'wrong-name' }),
    ).toEqual(false);

    // skip if editor name is in the list of editors without binaries
    expect(
      hasDownloadBinaries([workspaceWithEditorId], { namespace, workspaceName: name }),
    ).toEqual(false);

    const workspaceWithEditorDevfileEmptyContent = constructWorkspace(
      devWorkspaceBuilder
        .withMetadata({
          name,
          namespace,
          annotations: {
            [DEVWORKSPACE_CHE_EDITOR]: '',
          },
        })
        .build(),
    );
    // skip if editor annotation is empty
    expect(
      hasDownloadBinaries([workspaceWithEditorDevfileEmptyContent], {
        namespace,
        workspaceName: name,
      }),
    ).toEqual(false);
  });

  it('should return false for che-code editors', () => {
    const name = 'test';
    const namespace = 'che-user';

    const cheCodeEditors = ['che-incubator/che-code/latest', 'che-incubator/che-code/insiders'];

    for (const editorId of cheCodeEditors) {
      const workspace = constructWorkspace(
        devWorkspaceBuilder
          .withMetadata({
            name,
            namespace,
            annotations: {
              [DEVWORKSPACE_CHE_EDITOR]: editorId,
            },
          })
          .build(),
      );
      expect(hasDownloadBinaries([workspace], { namespace, workspaceName: name })).toEqual(false);
    }
  });

  it('should return true for editors with binaries', () => {
    const name = 'test';
    const namespace = 'che-user';

    const editorsWithBinaries = [
      'che-incubator/che-idea-server/latest',
      'che-incubator/che-pycharm-server/latest',
    ];

    for (const editorId of editorsWithBinaries) {
      const workspace = constructWorkspace(
        devWorkspaceBuilder
          .withMetadata({
            name,
            namespace,
            annotations: {
              [DEVWORKSPACE_CHE_EDITOR]: editorId,
            },
          })
          .build(),
      );
      expect(hasDownloadBinaries([workspace], { namespace, workspaceName: name })).toEqual(true);
    }
  });

  it('should return false when annotation contains devfile content with che-code editor name', () => {
    const name = 'test';
    const namespace = 'che-user';

    expect(EDITORS_WITHOUT_BINARIES).toEqual(['che-code']);

    const editorDevfileContent = [
      'commands:',
      '  - apply:',
      '      component: che-code-injector',
      '    id: init-container-command',
      'metadata:',
      '  name: che-code',
      '  publisher: che-incubator',
      'schemaVersion: 2.3.0',
    ].join('\n');

    const workspace = constructWorkspace(
      devWorkspaceBuilder
        .withMetadata({
          name,
          namespace,
          annotations: {
            [DEVWORKSPACE_CHE_EDITOR]: editorDevfileContent,
          },
        })
        .build(),
    );

    expect(hasDownloadBinaries([workspace], { namespace, workspaceName: name })).toEqual(false);
  });

  it('should return true when annotation contains devfile content with JetBrains editor name', () => {
    const name = 'test';
    const namespace = 'che-user';

    const editorDevfileContent = [
      'commands:',
      '  - apply:',
      '      component: idea-injector',
      '    id: init-container-command',
      'metadata:',
      '  name: che-idea-server',
      '  publisher: che-incubator',
      'schemaVersion: 2.3.0',
    ].join('\n');

    const workspace = constructWorkspace(
      devWorkspaceBuilder
        .withMetadata({
          name,
          namespace,
          annotations: {
            [DEVWORKSPACE_CHE_EDITOR]: editorDevfileContent,
          },
        })
        .build(),
    );

    expect(hasDownloadBinaries([workspace], { namespace, workspaceName: name })).toEqual(true);
  });
});
