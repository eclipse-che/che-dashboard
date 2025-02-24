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

import userEvent from '@testing-library/user-event';
import React from 'react';

import DevfileEditorTab from '@/pages/WorkspaceDetails/DevfileEditorTab';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

jest.mock('@/components/EditorTools');
jest.mock('@/components/DevfileViewer');

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('DevfileEditorTab', () => {
  let workspace: Workspace;

  describe('component', () => {
    test('snapshot with devfile content', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'wksp',
          annotations: {
            'che.eclipse.org/devfile': `schemaVersion: 2.2.0\nmetadata:\n generateName: dev-wksp\n`,
          },
        })
        .build();
      workspace = constructWorkspace(devWorkspace);

      const snapshot = createSnapshot(true, workspace);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('snapshot without devfile content', () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'wksp',
          annotations: {
            'che.eclipse.org/devfile': '',
          },
        })
        .build();
      workspace = constructWorkspace(devWorkspace);

      const snapshot = createSnapshot(true, workspace);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('expanded state', async () => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withMetadata({
          name: 'wksp',
          annotations: {
            'che.eclipse.org/devfile': `schemaVersion: 2.2.0\nmetadata:\n generateName: dev-wksp\n`,
          },
        })
        .build();
      workspace = constructWorkspace(devWorkspace);

      renderComponent(true, workspace);

      const buttonExpand = screen.getByRole('button', { name: 'Expand Editor' });
      await userEvent.click(buttonExpand);

      const isExpanded = screen.getByTestId('devfile-viewer-is-expanded');
      expect(isExpanded).toHaveTextContent('true');
    });
  });
});

function getComponent(isActive: boolean, workspace: Workspace) {
  return <DevfileEditorTab isActive={isActive} workspace={workspace} />;
}
