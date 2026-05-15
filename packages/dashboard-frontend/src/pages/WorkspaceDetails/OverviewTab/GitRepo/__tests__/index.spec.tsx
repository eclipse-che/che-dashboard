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

  test('airgap sample URL: percent-encoded query string decoded correctly', async () => {
    // Regression for CRW-9659: the old split('=')[1] parser truncated the URL at the
    // second '=' sign. For an airgap URL stored as
    //   url=http://…/download%3Fid%3Dnodejs-express&che-editor=…&storageType=per-user
    // it produced "…/download%3Fid%3Dnodejs-express?che-editor=…" — a double-'?' URL
    // with the '=nodejs-express' value missing.
    // URLSearchParams.get('url') correctly decodes %3F→? and %3D→=, giving
    // "…/download?id=nodejs-express", and appends other params with '&'.
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

    const copied = mockClipboard.mock.calls[0][0] as string;
    // The URL must not contain a double '?' — that was the symptom of the bug.
    expect(copied.split('?').length - 1).toBe(1);
    // The decoded query param must be preserved.
    expect(copied).toContain('id=nodejs-express');
    // Factory params are still included but appended with '&', not '?'.
    expect(copied).toContain('&che-editor=');
    expect(copied).toContain('&storageType=per-user');
  });
});

function getComponent(workspace: Workspace) {
  return <GitRepoFormGroup workspace={workspace} />;
}
