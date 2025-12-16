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

    const editorDevfileV2Content = 'schemaVersion: 2.2.0';
    const workspaceWithEditorDevfileV2Content = constructWorkspace(
      devWorkspaceBuilder
        .withMetadata({
          name,
          namespace,
          annotations: {
            [DEVWORKSPACE_CHE_EDITOR]: editorDevfileV2Content,
          },
        })
        .build(),
    );
    // skip if editor annotation contains the V2 devfile content
    expect(
      hasDownloadBinaries([workspaceWithEditorDevfileV2Content], {
        namespace,
        workspaceName: name,
      }),
    ).toEqual(false);

    const editorDevfileV1Content = 'apiVersion: 1.0.0';
    const workspaceWithEditorDevfileV1Content = constructWorkspace(
      devWorkspaceBuilder
        .withMetadata({
          name,
          namespace,
          annotations: {
            [DEVWORKSPACE_CHE_EDITOR]: editorDevfileV1Content,
          },
        })
        .build(),
    );
    // skip if editor annotation contains the V1 devfile content
    expect(
      hasDownloadBinaries([workspaceWithEditorDevfileV1Content], {
        namespace,
        workspaceName: name,
      }),
    ).toEqual(false);
  });

  it('should return true', () => {
    const name = 'test';
    const namespace = 'che-user';
    const editorId = 'che-incubator/che-idea-server/latest';
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
    // verify the list of editors without binaries
    expect(EDITORS_WITHOUT_BINARIES).toEqual(['che-code']);
    // if editor name is not in the list of editors without binaries
    expect(hasDownloadBinaries([workspace], { namespace, workspaceName: name })).toEqual(true);
  });
});
