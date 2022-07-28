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
import { render, screen, waitFor } from '@testing-library/react';
import { StateMock } from '@react-mock/state';
import { ROUTE } from '../../../Routes/routes';
import { getMockRouterProps } from '../../../services/__mocks__/router';
import { FakeStoreBuilder } from '../../../store/__mocks__/storeBuilder';
import { LoadingStep } from '../../../components/Loader/Step';
import userEvent from '@testing-library/user-event';
import { RouteComponentProps } from 'react-router';
import LoaderContainer, { State } from '..';
import getComponentRenderer from '../../../services/__mocks__/getComponentRenderer';

jest.mock('../Factory');
jest.mock('../Workspace');

const { renderComponent } = getComponentRenderer(getComponent);

describe('Loader container', () => {
  const url = 'factory-url';
  const store = new FakeStoreBuilder().build();

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('Factory mode', () => {
    let props: RouteComponentProps;

    beforeEach(() => {
      props = getMockRouterProps(ROUTE.FACTORY_LOADER_URL, { url });
    });

    it('should render the Factory loader', () => {
      renderComponent(props, store);
      expect(screen.queryByTestId('factory-loader-container')).not.toBeNull();
    });

    test('number of steps', () => {
      renderComponent(props, store);

      expect(screen.queryByTestId(LoadingStep[LoadingStep.INITIALIZE])).not.toBeNull();
      expect(screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE])).not.toBeNull();
      expect(
        screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__FETCH_DEVFILE]),
      ).not.toBeNull();
      expect(
        screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__APPLY_DEVFILE]),
      ).not.toBeNull();
      expect(screen.queryByTestId(LoadingStep[LoadingStep.START_WORKSPACE])).not.toBeNull();
      expect(screen.queryByTestId(LoadingStep[LoadingStep.OPEN_WORKSPACE])).not.toBeNull();
    });

    it('should switch to the next step', () => {
      renderComponent(props, store);

      const currentStepIndex = screen.getByTestId('current-step-index');
      const nextStepButton = screen.getByTestId('on-next-step');

      expect(currentStepIndex.textContent).toEqual('0');

      userEvent.click(nextStepButton);

      expect(currentStepIndex.textContent).toEqual('1');
    });

    it('should handle onRestart', async () => {
      const localState = {
        currentStepIndex: 1,
        initialMode: 'factory',
      } as State;
      renderComponent(props, store, localState);

      const currentStepIndex = screen.getByTestId('current-step-index');
      await waitFor(() => expect(currentStepIndex.textContent).toEqual('1'));

      const restartButton = screen.getByTestId('on-restart');

      userEvent.click(restartButton);

      await waitFor(() => expect(currentStepIndex.textContent).toEqual('0'));
    });

    describe('when starting the workspace', () => {
      let localState: Partial<State>;
      let props: RouteComponentProps;

      beforeEach(() => {
        localState = {
          initialMode: 'factory',
          currentStepIndex: 4, // LoadingStep.START_WORKSPACE
        };
        props = getMockRouterProps(ROUTE.FACTORY_LOADER_URL, { url });
      });

      it('should switch to the IDE loader', async () => {
        const { reRenderComponent } = renderComponent(props, store, localState);

        const currentStepIndexFactoryMode = screen.getByTestId('current-step-index');

        await waitFor(() => expect(currentStepIndexFactoryMode.textContent).toEqual('4'));

        // factory mode is on
        expect(screen.queryByTestId('factory-loader-container')).not.toBeNull();
        expect(screen.queryByTestId('ide-loader-container')).toBeNull();

        const nextProps = getMockRouterProps(ROUTE.IDE_LOADER, {
          namespace: 'user-che',
          workspaceName: 'my-wksp',
        });
        reRenderComponent(nextProps, store, localState);

        const currentStepIndexIdeMode = screen.getByTestId('current-step-index');

        await waitFor(() => expect(currentStepIndexIdeMode.textContent).toEqual('4'));

        // IDE mode is on
        expect(screen.queryByTestId('ide-loader-container')).not.toBeNull();
        expect(screen.queryByTestId('factory-loader-container')).toBeNull();
      });

      it('should preserve all the steps', async () => {
        const { reRenderComponent } = renderComponent(props, store, localState);

        // all steps should be shown in the factory mode
        expect(screen.queryByTestId(LoadingStep[LoadingStep.INITIALIZE])).not.toBeNull();
        expect(screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE])).not.toBeNull();
        expect(
          screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__FETCH_DEVFILE]),
        ).not.toBeNull();
        expect(
          screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__APPLY_DEVFILE]),
        ).not.toBeNull();
        expect(screen.queryByTestId(LoadingStep[LoadingStep.START_WORKSPACE])).not.toBeNull();
        expect(screen.queryByTestId(LoadingStep[LoadingStep.OPEN_WORKSPACE])).not.toBeNull();

        // switch to the next step
        const nextProps = getMockRouterProps(ROUTE.IDE_LOADER, {
          namespace: 'user-che',
          workspaceName: 'my-wksp',
        });
        reRenderComponent(nextProps, store, localState);

        const currentStepIndexIdeMode = screen.getByTestId('current-step-index');
        await waitFor(() => expect(currentStepIndexIdeMode.textContent).toEqual('4'));

        // all steps should be shown in the IDE mode
        expect(screen.queryByTestId(LoadingStep[LoadingStep.INITIALIZE])).not.toBeNull();
        expect(screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE])).not.toBeNull();
        expect(
          screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__FETCH_DEVFILE]),
        ).not.toBeNull();
        expect(
          screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__APPLY_DEVFILE]),
        ).not.toBeNull();
        expect(screen.queryByTestId(LoadingStep[LoadingStep.START_WORKSPACE])).not.toBeNull();
        expect(screen.queryByTestId(LoadingStep[LoadingStep.OPEN_WORKSPACE])).not.toBeNull();
      });
    });
  });

  describe('IDE mode', () => {
    let props: RouteComponentProps;

    beforeEach(() => {
      const namespace = 'user-che';
      const workspaceName = 'wksp-name';
      props = getMockRouterProps(ROUTE.IDE_LOADER, { namespace, workspaceName });
    });

    it('should render the IDE loader', () => {
      renderComponent(props, store);
      expect(screen.queryByTestId('ide-loader-container')).not.toBeNull();
    });

    test('number of steps', () => {
      renderComponent(props, store);

      expect(screen.queryByTestId(LoadingStep[LoadingStep.INITIALIZE])).not.toBeNull();

      expect(screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE])).toBeNull();
      expect(
        screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__FETCH_DEVFILE]),
      ).toBeNull();
      expect(
        screen.queryByTestId(LoadingStep[LoadingStep.CREATE_WORKSPACE__APPLY_DEVFILE]),
      ).toBeNull();

      expect(screen.queryByTestId(LoadingStep[LoadingStep.START_WORKSPACE])).not.toBeNull();
      expect(screen.queryByTestId(LoadingStep[LoadingStep.OPEN_WORKSPACE])).not.toBeNull();
    });

    it('should switch to the next step', () => {
      renderComponent(props, store);

      const currentStepIndex = screen.getByTestId('current-step-index');
      const nextStepButton = screen.getByTestId('on-next-step');

      expect(currentStepIndex.textContent).toEqual('0');

      userEvent.click(nextStepButton);

      expect(currentStepIndex.textContent).toEqual('1');
    });

    it('should handle onRestart', async () => {
      const localState = {
        currentStepIndex: 1,
        initialMode: 'workspace',
      } as State;
      renderComponent(props, store, localState);

      const currentStepIndex = screen.getByTestId('current-step-index');
      await waitFor(() => expect(currentStepIndex.textContent).toEqual('1'));

      const restartButton = screen.getByTestId('on-restart');
      userEvent.click(restartButton);

      await waitFor(() => expect(currentStepIndex.textContent).toEqual('0'));
    });
  });
});

function getComponent(
  props: RouteComponentProps<any>,
  store: Store,
  localState?: Partial<State>,
): React.ReactElement {
  let component;
  if (localState) {
    component = (
      <StateMock state={localState}>
        <LoaderContainer {...props} />
      </StateMock>
    );
  } else {
    component = <LoaderContainer {...props} />;
  }
  return <Provider store={store}>{component}</Provider>;
}
