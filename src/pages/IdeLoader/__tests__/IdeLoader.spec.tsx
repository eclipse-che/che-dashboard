/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
import renderer, { ReactTestRenderer } from 'react-test-renderer';
import { Store } from 'redux';
import { Provider } from 'react-redux';
import IdeLoaderTabs from '../';
import { LoadIdeSteps } from '../../../containers/IdeLoader';
import { createFakeStore } from '../../../store/__mocks__/store';
import { createFakeWorkspace } from '../../../store/__mocks__/workspace';

const workspaceName = 'wksp-test';
const workspaceId = 'testWorkspaceId';
const workspace = createFakeWorkspace(workspaceId, workspaceName);
const store = createFakeStore([workspace]);

describe('The Ide Loader page  component', () => {

  it('should render INITIALIZING step correctly', () => {
    const currentStep = LoadIdeSteps.INITIALIZING;
    const hasError = false;
    const component = renderComponent(store, currentStep, workspaceName, workspaceId, hasError);

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render INITIALIZING step with an error correctly', () => {
    const currentStep = LoadIdeSteps.INITIALIZING;
    const hasError = true;
    const component = renderComponent(store, currentStep, workspaceName, workspaceId, hasError);

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render START_WORKSPACE step correctly', () => {
    const currentStep = LoadIdeSteps.START_WORKSPACE;
    const hasError = false;
    const component = renderComponent(store, currentStep, workspaceName, workspaceId, hasError);

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render START_WORKSPACE step with an error correctly', () => {
    const currentStep = LoadIdeSteps.START_WORKSPACE;
    const hasError = true;
    const component = renderComponent(store, currentStep, workspaceName, workspaceId, hasError);

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render OPEN_IDE step correctly', () => {
    const currentStep = LoadIdeSteps.OPEN_IDE;
    const hasError = false;
    const component = renderComponent(store, currentStep, workspaceName, workspaceId, hasError);

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render OPEN_IDE step with an error correctly', () => {
    const currentStep = LoadIdeSteps.OPEN_IDE;
    const hasError = true;
    const component = renderComponent(store, currentStep, workspaceName, workspaceId, hasError);

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render Open IDE in the iframe correctly', () => {
    const currentStep = LoadIdeSteps.OPEN_IDE;
    const hasError = false;
    const ideUrl = 'https://server-test-4400.192.168.99.100.nip.io';
    const component = renderComponent(store, currentStep, workspaceName, workspaceId, hasError, ideUrl);

    expect(component.toJSON()).toMatchSnapshot();
  });

});

function renderComponent(
  store: Store,
  currentStep: LoadIdeSteps,
  workspaceName: string,
  workspaceId: string,
  hasError: boolean,
  ideUrl?: string,
): ReactTestRenderer {
  return renderer.create(
    <Provider store={store}>
      <IdeLoaderTabs
        currentStep={currentStep}
        workspaceName={workspaceName}
        workspaceId={workspaceId}
        hasError={hasError}
        ideUrl={ideUrl}
      />
    </Provider>,
  );
}
