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

import { api } from '@eclipse-che/common';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { GitServicesList, Props } from '@/pages/UserPreferences/GitServices/List';
import getComponentRenderer, { screen, within } from '@/services/__mocks__/getComponentRenderer';

jest.mock('@/pages/UserPreferences/GitServices/List/StatusIcon');
jest.mock('@/pages/UserPreferences/GitServices/List/Tooltip');
jest.mock('@/pages/UserPreferences/GitServices/Toolbar');

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

function buildOauthToken(
  gitProvider: Exclude<api.GitProvider, 'azure-devops'>,
  gitProviderEndpoint: string,
  tokenName: string,
): api.PersonalAccessToken {
  return {
    cheUserId: 'test-user',
    gitProvider,
    gitProviderEndpoint,
    tokenData: 'test-token-data',
    tokenName,
    isOauth: true,
  };
}

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
      oauthTokens: [
        buildOauthToken('github', 'https://github.com', 'oauth2-github-token'),
        buildOauthToken('gitlab', 'https://gitlab.com', 'oauth2-gitlab-token'),
      ],
      onRevokeServices: jest.fn(),
      onClearService: jest.fn(),
      onDeleteService: jest.fn(),
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

    const bitbucketRow = screen.getByTestId('bitbucket');
    const githubRow = screen.getByTestId('github');
    const gitlabRow = screen.getByTestId('gitlab');

    expect(bitbucketRow).toHaveTextContent('https://bitbucket.com');
    expect(githubRow).toHaveTextContent('https://github.com');
    expect(gitlabRow).toHaveTextContent('https://gitlab.com');

    // Bitbucket: no token + not in CAN_REVOKE → checkbox disabled, kebab disabled
    expect(within(bitbucketRow).getByRole('checkbox')).toBeDisabled();
    expect(within(bitbucketRow).getByRole('button', { name: 'Kebab toggle' })).toBeDisabled();

    // GitHub: has token + in CAN_REVOKE → checkbox enabled, kebab enabled
    expect(within(githubRow).getByRole('checkbox')).toBeEnabled();
    expect(within(githubRow).getByRole('button', { name: 'Kebab toggle' })).toBeEnabled();

    // GitLab: has token + in CAN_REVOKE → checkbox enabled, kebab enabled
    expect(within(gitlabRow).getByRole('checkbox')).toBeEnabled();
    expect(within(gitlabRow).getByRole('button', { name: 'Kebab toggle' })).toBeEnabled();
  });

  test('token name column', () => {
    renderComponent(props);

    expect(screen.getByRole('columnheader', { name: 'Token Name' })).toBeTruthy();

    expect(screen.getByTestId('github-token-name')).toHaveTextContent('oauth2-github-token');
    expect(screen.getByTestId('gitlab-token-name')).toHaveTextContent('oauth2-gitlab-token');

    // no OAuth token secret for Bitbucket, the cell is empty
    expect(screen.getByTestId('bitbucket-token-name')).toBeEmptyDOMElement();
  });

  test('service revocable (gitlab)', () => {
    renderComponent(props);

    const gitlabRow = screen.getByTestId('gitlab');
    expect(within(gitlabRow).getByRole('checkbox')).toBeEnabled();
    expect(within(gitlabRow).getByRole('button', { name: 'Kebab toggle' })).toBeEnabled();
  });

  test('service revocable (github)', async () => {
    renderComponent(props);

    const githubRow = screen.getByTestId('github');
    const githubCheckbox = within(githubRow).getByRole('checkbox');
    const githubKebab = within(githubRow).getByRole('button', { name: 'Kebab toggle' });

    expect(githubCheckbox).toBeEnabled();
    expect(githubCheckbox).not.toBeChecked();

    await userEvent.click(githubCheckbox);
    expect(githubCheckbox).toBeChecked();

    await userEvent.click(githubCheckbox);
    expect(githubCheckbox).not.toBeChecked();

    expect(githubKebab).toBeEnabled();
    await userEvent.click(githubKebab);

    const revokeItem = screen.getByRole('menuitem', { name: 'Revoke' });
    await userEvent.click(revokeItem);

    expect(props.onRevokeServices).toHaveBeenCalledTimes(1);
    expect(props.onRevokeServices).toHaveBeenCalledWith([
      { name: 'github', endpointUrl: 'https://github.com' },
    ]);
  });

  test('delete the OAuth token (github)', async () => {
    renderComponent(props);

    const githubRow = screen.getByTestId('github');
    const githubKebab = within(githubRow).getByRole('button', { name: 'Kebab toggle' });

    await userEvent.click(githubKebab);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete OAuth token' }));

    expect(props.onDeleteService).toHaveBeenCalledTimes(1);
    expect(props.onDeleteService).toHaveBeenCalledWith({
      name: 'github',
      endpointUrl: 'https://github.com',
    });
  });

  test('delete the OAuth token is available for a non-revocable service (bitbucket)', async () => {
    renderComponent({ ...props, providersWithToken: ['bitbucket'] });

    const bitbucketRow = screen.getByTestId('bitbucket');
    const bitbucketKebab = within(bitbucketRow).getByRole('button', { name: 'Kebab toggle' });

    // the service can not be revoked from the Dashboard, but the token can be deleted
    expect(bitbucketKebab).toBeEnabled();

    await userEvent.click(bitbucketKebab);

    expect(screen.getByRole('menuitem', { name: 'Revoke' })).toBeDisabled();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete OAuth token' }));

    expect(props.onDeleteService).toHaveBeenCalledWith({
      name: 'bitbucket',
      endpointUrl: 'https://bitbucket.com',
    });
  });

  test('can clear opt-out (github)', async () => {
    props = {
      gitOauth: [{ name: 'github', endpointUrl: 'https://github.com' }],
      isDisabled: false,
      oauthTokens: [],
      onRevokeServices: jest.fn(),
      onClearService: jest.fn(),
      onDeleteService: jest.fn(),
      providersWithToken: [],
      skipOauthProviders: ['github'],
    };
    renderComponent(props);

    const githubRow = screen.getByTestId('github');
    const githubCheckbox = within(githubRow).getByRole('checkbox');
    const githubKebab = within(githubRow).getByRole('button', { name: 'Kebab toggle' });

    expect(githubCheckbox).toBeDisabled();
    expect(githubKebab).toBeEnabled();

    await userEvent.click(githubKebab);
    const clearItem = screen.getByRole('menuitem', { name: 'Clear' });
    await userEvent.click(clearItem);

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
    const githubKebab = within(githubRow).getByRole('button', { name: 'Kebab toggle' });

    expect(githubCheckbox).toBeEnabled();
    expect(githubKebab).toBeEnabled();

    const revokeButtonDisabled = screen.getByTestId('revoke-is-disabled');
    expect(revokeButtonDisabled).toHaveTextContent('false');

    reRenderComponent({ ...props, isDisabled: true });

    expect(githubCheckbox).toBeDisabled();
    expect(githubKebab).toBeDisabled();
    expect(revokeButtonDisabled).toHaveTextContent('true');
  });
});

function getComponent(props: Props): React.ReactElement<Props> {
  return (
    <GitServicesList
      gitOauth={props.gitOauth}
      isDisabled={props.isDisabled}
      oauthTokens={props.oauthTokens}
      onRevokeServices={props.onRevokeServices}
      onClearService={props.onClearService}
      onDeleteService={props.onDeleteService}
      providersWithToken={props.providersWithToken}
      skipOauthProviders={props.skipOauthProviders}
    />
  );
}
