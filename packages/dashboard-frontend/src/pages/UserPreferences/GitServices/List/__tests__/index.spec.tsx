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
import React from 'react';

import { GitServicesList, Props } from '@/pages/UserPreferences/GitServices/List';
import getComponentRenderer, { screen, within } from '@/services/__mocks__/getComponentRenderer';

jest.mock('@/pages/UserPreferences/GitServices/List/StatusIcon');
jest.mock('@/pages/UserPreferences/GitServices/List/Tooltip');
jest.mock('@/pages/UserPreferences/GitServices/Toolbar');

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('GitServicesList', () => {
  let props: Props;

  beforeEach(() => {
    props = {
      gitOauth: [
        { name: 'github', endpointUrl: 'https://github.com' },
        { name: 'gitlab', endpointUrl: 'https://gitlab.com' },
        { name: 'bitbucket', endpointUrl: 'https://bitbucket.com' },
      ],
      isDisabled: false,
      onRevokeServices: jest.fn(),
      onClearService: jest.fn(),
      providersWithToken: ['github', 'gitlab'],
      skipOauthProviders: [],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot', () => {
    const snapshot = createSnapshot(props);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('initial state', () => {
    renderComponent(props);

    // rows are DataListItems — query by data-testid
    const bitbucketRow = screen.getByTestId('bitbucket');
    const githubRow = screen.getByTestId('github');
    const gitlabRow = screen.getByTestId('gitlab');

    expect(bitbucketRow).toHaveTextContent('https://bitbucket.com');
    expect(githubRow).toHaveTextContent('https://github.com');
    expect(gitlabRow).toHaveTextContent('https://gitlab.com');

    // Bitbucket: no token + not in CAN_REVOKE → checkbox disabled, Revoke disabled
    expect(within(bitbucketRow).getByRole('checkbox')).toBeDisabled();
    expect(within(bitbucketRow).getByRole('button', { name: 'Revoke' })).toBeDisabled();

    // GitHub: has token + in CAN_REVOKE → checkbox enabled, Revoke enabled
    expect(within(githubRow).getByRole('checkbox')).toBeEnabled();
    expect(within(githubRow).getByRole('button', { name: 'Revoke' })).toBeEnabled();

    // GitLab: has token + in CAN_REVOKE → checkbox enabled, Revoke enabled
    expect(within(gitlabRow).getByRole('checkbox')).toBeEnabled();
    expect(within(gitlabRow).getByRole('button', { name: 'Revoke' })).toBeEnabled();
  });

  test('service revocable (gitlab)', () => {
    renderComponent(props);

    const gitlabRow = screen.getByTestId('gitlab');
    expect(within(gitlabRow).getByRole('checkbox')).toBeEnabled();
    expect(within(gitlabRow).getByRole('button', { name: 'Revoke' })).toBeEnabled();
  });

  test('service revocable (github)', async () => {
    renderComponent(props);

    const githubRow = screen.getByTestId('github');
    const githubCheckbox = within(githubRow).getByRole('checkbox');
    const githubRevokeBtn = within(githubRow).getByRole('button', { name: 'Revoke' });

    expect(githubCheckbox).toBeEnabled();
    expect(githubCheckbox).not.toBeChecked();

    await userEvent.click(githubCheckbox);
    expect(githubCheckbox).toBeChecked();

    await userEvent.click(githubCheckbox);
    expect(githubCheckbox).not.toBeChecked();

    expect(githubRevokeBtn).toBeEnabled();
    await userEvent.click(githubRevokeBtn);

    expect(props.onRevokeServices).toHaveBeenCalledTimes(1);
    expect(props.onRevokeServices).toHaveBeenCalledWith([
      { name: 'github', endpointUrl: 'https://github.com' },
    ]);
  });

  test('can clear opt-out (github)', async () => {
    props = {
      gitOauth: [{ name: 'github', endpointUrl: 'https://github.com' }],
      isDisabled: false,
      onRevokeServices: jest.fn(),
      onClearService: jest.fn(),
      providersWithToken: [],
      skipOauthProviders: ['github'],
    };
    renderComponent(props);

    const githubRow = screen.getByTestId('github');
    const githubCheckbox = within(githubRow).getByRole('checkbox');
    const githubClearBtn = within(githubRow).getByRole('button', { name: 'Clear' });

    expect(githubCheckbox).toBeDisabled();
    expect(githubClearBtn).toBeEnabled();

    await userEvent.click(githubClearBtn);

    expect(props.onClearService).toHaveBeenCalledTimes(1);
    expect(props.onClearService).toHaveBeenCalledWith('github');
  });

  test('toolbar', async () => {
    renderComponent(props);

    const selectedItemsCount = screen.getByTestId('selected-items-count');
    expect(selectedItemsCount).toHaveTextContent('0');

    const githubRow = screen.getByTestId('github');
    const githubCheckbox = within(githubRow).getByRole('checkbox');
    await userEvent.click(githubCheckbox);

    expect(selectedItemsCount).toHaveTextContent('1');

    const toolbar = screen.getByTestId('git-services-toolbar');
    const toolbarRevokeButton = within(toolbar).getByRole('button', { name: 'Revoke' });
    await userEvent.click(toolbarRevokeButton);

    expect(props.onRevokeServices).toHaveBeenCalledTimes(1);
    expect(props.onRevokeServices).toHaveBeenCalledWith([
      { name: 'github', endpointUrl: 'https://github.com' },
    ]);
  });

  test('disabled list', () => {
    const { reRenderComponent } = renderComponent(props);

    const githubRow = screen.getByTestId('github');
    const githubCheckbox = within(githubRow).getByRole('checkbox');
    const githubRevokeBtn = within(githubRow).getByRole('button', { name: 'Revoke' });

    expect(githubCheckbox).toBeEnabled();
    expect(githubRevokeBtn).toBeEnabled();

    const revokeButtonDisabled = screen.getByTestId('revoke-is-disabled');
    expect(revokeButtonDisabled).toHaveTextContent('false');

    reRenderComponent({ ...props, isDisabled: true });

    expect(githubCheckbox).toBeDisabled();
    expect(githubRevokeBtn).toBeDisabled();
    expect(revokeButtonDisabled).toHaveTextContent('true');
  });
});

function getComponent(props: Props): React.ReactElement<Props> {
  return (
    <GitServicesList
      gitOauth={props.gitOauth}
      isDisabled={props.isDisabled}
      onRevokeServices={props.onRevokeServices}
      onClearService={props.onClearService}
      providersWithToken={props.providersWithToken}
      skipOauthProviders={props.skipOauthProviders}
    />
  );
}
