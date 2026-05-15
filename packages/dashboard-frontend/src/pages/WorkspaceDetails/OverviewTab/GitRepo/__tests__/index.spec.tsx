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

    // Only the URL is copied — factory orchestration params (editor-image, etc.)
    // must NOT be appended to the git repo URL.
    expect(mockClipboard).toHaveBeenCalledWith('https://github.com/eclipse-che/che-dashboard');

    /* 'Copy to clipboard' should be hidden for a while */

    expect(screen.queryByRole('button', { name: copyButtonName })).toBeFalsy;

    const copyButtonNameAfter = 'Copied';
    expect(screen.queryByRole('button', { name: copyButtonNameAfter })).toBeTruthy;

    /* 'Copy to clipboard' should re-appear after 3000ms */

    jest.advanceTimersByTime(4000);
    expect(screen.queryByRole('button', { name: copyButtonName })).toBeTruthy;
    expect(screen.queryByRole('button', { name: copyButtonNameAfter })).toBeFalsy;
  });

  test('airgap sample URL: factory params must not be appended to the Git repo URL', async () => {
    // Regression test for: https://redhat.atlassian.net/browse/CRW-9659
    // The old split('&') + split('=') parser reconstructed the URL by appending
    // all factory params (che-editor, storageType, …), producing malformed URLs:
    //   "…/download?id?che-editor=che-incubator/che-code/latest&storageType=per-user"
    // The correct behaviour: only the 'url' param value is shown; nothing is appended.
    const devWorkspace = new DevWorkspaceBuilder()
      .withMetadata({
        name: 'test-workspace',
        annotations: {
          [DEVWORKSPACE_DEVFILE_SOURCE]: dump({
            factory: {
              params:
                'url=http://che-dashboard.eclipse-che.svc:8080/dashboard/api/airgap-sample/devfile/download%3Fid%3Dnodejs-express&che-editor=che-incubator%2Fche-code%2Flatest&storageType=per-user',
            },
          }),
        },
      })
      .build();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderComponent(constructWorkspace(devWorkspace));

    const copyButton = screen.getByRole('button', { name: 'Copy to clipboard' });
    await user.click(copyButton);

    // URLSearchParams.get() decodes %3F → ? and %3D → =, giving the clean devfile URL.
    // Factory params (che-editor, storageType) must NOT appear in the copied value.
    expect(mockClipboard).toHaveBeenCalledWith(
      'http://che-dashboard.eclipse-che.svc:8080/dashboard/api/airgap-sample/devfile/download?id=nodejs-express',
    );
    expect(mockClipboard).not.toHaveBeenCalledWith(expect.stringContaining('che-editor'));
    expect(mockClipboard).not.toHaveBeenCalledWith(expect.stringContaining('storageType'));
  });
});

function getComponent(workspace: Workspace) {
  return <GitRepoFormGroup workspace={workspace} />;
}
