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
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import renderer from 'react-test-renderer';
import userEvent from '@testing-library/user-event';
import { dump } from 'js-yaml';
import { IDevWorkspace, IDevWorkspaceDevfile } from '@eclipse-che/devworkspace-client';
import EditorTab from '..';
import { Workspace, convertWorkspace } from '../../../../services/workspaceAdapter';
import { CheWorkspaceBuilder } from '../../../../store/__mocks__/cheWorkspaceBuilder';
import { DevWorkspaceBuilder } from '../../../../store/__mocks__/devWorkspaceBuilder';
import { FakeStoreBuilder } from '../../../../store/__mocks__/storeBuilder';
import { DevWorkspaceClient } from '../../../../services/workspace-client/devWorkspaceClient';
import { container } from '../../../../inversify.config';

// uses the Devfile Editor mock
jest.mock('../../../../components/DevfileEditor');
jest.mock(
  '../EditorTools',
  () =>
    () => <div>Editor Tools</div>
);

describe('Editor Tab', () => {

  const mockOnSave = jest.fn();
  const mockOnWorkspaceWarning = jest.fn();

  function getComponent(
    store: Store,
    workspace: Workspace,
  ): React.ReactElement {
    return (
      <Provider store={store}>
        <EditorTab
          workspace={workspace}
          onSave={workspace => mockOnSave(workspace)}
          onDevWorkspaceWarning={() => mockOnWorkspaceWarning()}
        />
      </Provider>
    );
  }

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Che workspaces', () => {

    const workspaceName = 'test-workspace';
    let workspace: Workspace;
    let component: React.ReactElement;

    beforeEach(() => {
      const cheWorkspace = new CheWorkspaceBuilder()
        .withName(workspaceName)
        .build();
      const store = new FakeStoreBuilder()
        .withCheWorkspaces({
          workspaces: [cheWorkspace]
        })
        .build();
      workspace = convertWorkspace(cheWorkspace);
      component = getComponent(store, workspace);

    });

    it('should render the component', () => {
      const json = renderer.create(component).toJSON();
      expect(json).toMatchSnapshot();
    });

    it('should restore name', async () => {
      render(component);

      // copy the workspace devfile, remove 'name' field and paste new devfile into the editor
      const noNameDevfile = JSON.parse(JSON.stringify(workspace.devfile));
      delete noNameDevfile.metadata.name;
      const noNameDevfileContent = dump(noNameDevfile);

      const editor = screen.getByRole('textbox');
      fireEvent.input(editor, {
        target: {
          value: noNameDevfileContent,
        },
      });

      const saveButton = screen.getByRole('button', { name: 'Save' });

      await waitFor(() => expect(saveButton).toBeEnabled());
      userEvent.click(saveButton);

      await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        workspace: expect.objectContaining({
          devfile: expect.objectContaining({
            metadata: {
              name: workspaceName,
            },
          }),
        }),
      }));

    });

  });

  describe('devworkspaces', () => {
    const workspaceName = 'test-workspace';
    const namespace = 'test-ns';
    let workspace: Workspace;
    let component: React.ReactElement;

    beforeEach(() => {
      const devWorkspace = new DevWorkspaceBuilder()
        .withName(workspaceName)
        .withNamespace(namespace)
        .build();

      const devWorkspaceCopy = JSON.parse(JSON.stringify(devWorkspace));
      // mock devWorkspaceClient method to be able to save the devfile
      class MockDevWorkspaceClient extends DevWorkspaceClient {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async getWorkspaceByName(namespace: string, workspaceName: string): Promise<IDevWorkspace> {
          return devWorkspaceCopy;
        }
      }
      container.rebind(DevWorkspaceClient).to(MockDevWorkspaceClient).inSingletonScope();

      const store = new FakeStoreBuilder()
        .withDevWorkspaces({
          workspaces: [devWorkspace]
        })
        .build();
      workspace = convertWorkspace(devWorkspace);
      component = getComponent(store, workspace);
    });

    it('should render the component', () => {
      const json = renderer.create(component).toJSON();
      expect(json).toMatchSnapshot();
    });

    it('should restore name', async () => {
      render(component);

      // copy the workspace devfile, remove 'name' field and paste new devfile into the editor
      const noNameDevfile = JSON.parse(JSON.stringify(workspace.devfile)) as IDevWorkspaceDevfile;
      delete noNameDevfile.metadata.name;
      const noNameDevfileContent = dump(noNameDevfile);

      const editor = screen.getByRole('textbox');
      fireEvent.input(editor, {
        target: {
          value: noNameDevfileContent,
        },
      });

      const saveButton = screen.getByRole('button', { name: 'Save' });

      await waitFor(() => expect(saveButton).toBeEnabled());
      userEvent.click(saveButton);

      await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        workspace: expect.objectContaining({
          kind: 'DevWorkspace',
          metadata: expect.objectContaining({
            name: workspaceName,
          }),
        } as IDevWorkspace),
      }));

    });

    it('should restore namespace', async () => {
      render(component);

      // copy the workspace devfile, remove 'name' field and paste new devfile into the editor
      const noNamespaceDevfile = JSON.parse(JSON.stringify(workspace.devfile)) as IDevWorkspaceDevfile;
      delete noNamespaceDevfile.metadata.namespace;
      const noNamespaceDevfileContent = dump(noNamespaceDevfile);

      const editor = screen.getByRole('textbox');
      fireEvent.input(editor, {
        target: {
          value: noNamespaceDevfileContent,
        },
      });

      const saveButton = screen.getByRole('button', { name: 'Save' });

      await waitFor(() => expect(saveButton).toBeEnabled());
      userEvent.click(saveButton);

      await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        workspace: expect.objectContaining({
          kind: 'DevWorkspace',
          metadata: expect.objectContaining({
            namespace,
          }),
        } as IDevWorkspace),
      }));

    });

  });

});
