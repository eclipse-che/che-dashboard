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

import devfileApi from '@/services/devfileApi';
import { constructWorkspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { changeWorkspaceEditor } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/changeWorkspaceEditor';
import { getDevWorkspaceClient } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';

jest.mock('@/store/SanityCheck', () => ({
  ...jest.requireActual('@/store/SanityCheck'),
  verifyAuthorized: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers');
jest.mock('@/services/backend-client/devWorkspaceApi');
jest.mock('@/services/backend-client/devWorkspaceTemplateApi');

const wsAnnotations = {
  'che.eclipse.org/che-editor': 'che-incubator/che-code/latest',
  'che.eclipse.org/devfile-source':
    'url:\n  location: https://example.com\nfactory:\n  params: >-\n    che-editor=che-incubator/che-code/latest&storageType=per-user\n',
};

function buildWorkspace() {
  const dw = new DevWorkspaceBuilder()
    .withMetadata({
      name: 'empty-ido0',
      namespace: 'test-ns',
      uid: 'test-uid',
      annotations: wsAnnotations,
    })
    .withContributions([{ name: 'editor', kubernetes: { name: 'che-code-empty-ido0' } }])
    .build();
  return constructWorkspace(dw);
}

describe('changeWorkspaceEditor', () => {
  const intellijDevfile = {
    schemaVersion: '2.3.0',
    metadata: {
      name: 'che-idea-server',
      attributes: { publisher: 'che-incubator', version: 'latest' },
    },
    components: [
      {
        name: 'editor-injector',
        container: { image: 'quay.io/che-incubator/che-idea-dev-server:latest' },
      },
    ],
  };

  let mockCreateDevWorkspaceTemplate: jest.Mock;
  let mockPatchWorkspace: jest.Mock;
  let mockDeleteTemplate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateDevWorkspaceTemplate = jest.fn().mockResolvedValue({});
    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      createDevWorkspaceTemplate: mockCreateDevWorkspaceTemplate,
    });

    const DwApi = jest.requireMock('@/services/backend-client/devWorkspaceApi');
    mockPatchWorkspace = DwApi.patchWorkspace = jest
      .fn()
      .mockResolvedValue({ devWorkspace: { metadata: { name: 'empty-ido0' } } });

    const DwtApi = jest.requireMock('@/services/backend-client/devWorkspaceTemplateApi');
    mockDeleteTemplate = DwtApi.deleteTemplate = jest.fn().mockResolvedValue({});
  });

  it('creates a new DevWorkspaceTemplate for the new editor', async () => {
    const store = new MockStoreBuilder()
      .withDwPlugins({}, {}, false, [intellijDevfile as devfileApi.Devfile])
      .build();
    const workspace = buildWorkspace();
    await store.dispatch(changeWorkspaceEditor(workspace, 'che-incubator/che-idea-server/latest'));

    expect(mockCreateDevWorkspaceTemplate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateDevWorkspaceTemplate.mock.calls[0] as unknown[];
    expect(callArgs[0]).toBe('test-ns');
    expect(callArgs[1]).toMatchObject({ metadata: { name: 'empty-ido0' } });
    expect(callArgs[2]).toMatchObject({
      metadata: {
        name: 'che-idea-server-empty-ido0',
        annotations: {
          'che.eclipse.org/plugin-registry-url': expect.stringContaining('che-idea-server/latest'),
        },
      },
    });
  });

  it('patches che-editor annotation and spec.contributions on the workspace', async () => {
    const store = new MockStoreBuilder()
      .withDwPlugins({}, {}, false, [intellijDevfile as devfileApi.Devfile])
      .build();
    const workspace = buildWorkspace();
    await store.dispatch(changeWorkspaceEditor(workspace, 'che-incubator/che-idea-server/latest'));

    expect(mockPatchWorkspace).toHaveBeenCalledWith(
      'test-ns',
      'empty-ido0',
      expect.arrayContaining([
        expect.objectContaining({ path: '/metadata/annotations' }),
        expect.objectContaining({
          path: '/spec/contributions/0/kubernetes/name',
          value: 'che-idea-server-empty-ido0',
        }),
      ]),
    );

    const patches = mockPatchWorkspace.mock.calls[0][2] as Array<{
      path: string;
      value: Record<string, string>;
    }>;
    const annotationsPatch = patches.find(p => p.path === '/metadata/annotations');
    expect(annotationsPatch?.value['che.eclipse.org/che-editor']).toBe(
      'che-incubator/che-idea-server/latest',
    );
    expect(annotationsPatch?.value['che.eclipse.org/devfile-source']).toContain(
      'che-editor=che-incubator/che-idea-server/latest',
    );
  });

  it('deletes the old template', async () => {
    const store = new MockStoreBuilder()
      .withDwPlugins({}, {}, false, [intellijDevfile as devfileApi.Devfile])
      .build();
    const workspace = buildWorkspace();
    await store.dispatch(changeWorkspaceEditor(workspace, 'che-incubator/che-idea-server/latest'));

    expect(mockDeleteTemplate).toHaveBeenCalledWith('test-ns', 'che-code-empty-ido0');
  });

  it('throws when editor is not found in cmEditors', async () => {
    const store = new MockStoreBuilder().build(); // no cmEditors
    const workspace = buildWorkspace();
    await expect(
      store.dispatch(changeWorkspaceEditor(workspace, 'che-incubator/unknown-editor/latest')),
    ).rejects.toThrow('not found');
  });
});
