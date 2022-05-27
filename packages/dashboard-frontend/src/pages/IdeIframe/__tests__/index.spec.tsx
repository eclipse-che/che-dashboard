/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import { render, RenderResult, waitFor } from '@testing-library/react';
import renderer, { ReactTestRenderer } from 'react-test-renderer';
import { IdeIframe } from '..';

const mockOnOpenWorkspacesList = jest.fn();
const mockOnWorkspaceRestartFromIframe = jest.fn();

describe('IDE iframe page', () => {
  const ideUrl = 'main-url';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('component snapshot', () => {
    const snapshot = createSnapshot(ideUrl, false);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('in DevWorkspace mode', async () => {
    delete (window as any).location;
    const mockLocationReplace = jest.fn();
    (window.location as any) = { replace: mockLocationReplace };

    renderComponent(ideUrl, true);

    await waitFor(() => expect(mockLocationReplace).toHaveBeenCalled());
  });

  describe('in Che7 mode', () => {
    it('should handle "show-workspaces" message', async () => {
      renderComponent(ideUrl, false);

      window.postMessage('show-workspaces', 'http://localhost');

      await waitFor(() => expect(mockOnOpenWorkspacesList).toHaveBeenCalled());
    });

    it('should handle "restart-workspace" message', async () => {
      renderComponent(ideUrl, false);

      const workspaceId = 'iframe-workspace-id';
      const message = `restart-workspace:${workspaceId}:token`;
      window.postMessage(message, 'http://localhost');

      await waitFor(() =>
        expect(mockOnWorkspaceRestartFromIframe).toHaveBeenCalledWith(workspaceId),
      );
    });

    it('should skip non-string messages', async () => {
      renderComponent(ideUrl, false);

      const message = {};
      window.postMessage(message, 'http://localhost');

      await waitFor(() => expect(mockOnOpenWorkspacesList).not.toHaveBeenCalled());
      await waitFor(() => expect(mockOnWorkspaceRestartFromIframe).not.toHaveBeenCalled());
    });
  });
});

function getComponent(ideUrl: string, isDevWorkspace: boolean): React.ReactElement {
  return (
    <IdeIframe
      ideUrl={ideUrl}
      isDevWorkspace={isDevWorkspace}
      onOpenWorkspacesList={mockOnOpenWorkspacesList}
      onWorkspaceRestartFromIframe={mockOnWorkspaceRestartFromIframe}
    />
  );
}

function renderComponent(...args: Parameters<typeof getComponent>): RenderResult {
  return render(getComponent(...args));
}

function createSnapshot(...args: Parameters<typeof getComponent>): ReactTestRenderer {
  return renderer.create(getComponent(...args));
}
