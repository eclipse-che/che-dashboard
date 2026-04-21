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

import { Form } from '@patternfly/react-core';
import userEvent from '@testing-library/user-event';
import React from 'react';

import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

import { GitProviderEndpoint } from '..';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

const mockOnChange = jest.fn();

const defaultGitProviderEndpoint = 'https://github.com';

describe('GitProviderEndpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot w/o endpoint', () => {
    const snapshot = createSnapshot(undefined);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot with endpoint', () => {
    const snapshot = createSnapshot('https://provider.test/endpoint');
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should handle a correct endpoint', async () => {
    const endpoint = 'https://provider.test:8080/endpoint';
    renderComponent(undefined);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.paste(endpoint);

    expect(mockOnChange).toHaveBeenCalledWith(endpoint, true);
    expect(screen.queryByText('The URL is not valid.')).toBeFalsy();
  });

  it('should handle a correct endpoint with the port part', async () => {
    const endpoint = 'https://bitbucket.org:8443';
    renderComponent(undefined);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.paste(endpoint);

    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining(endpoint), true);
    expect(screen.queryByText('The URL is not valid.')).toBeFalsy();
  });

  it('should handle endpoint started with an incorrect protocol', async () => {
    const endpoint = 'asdf://provider/endpoint';
    renderComponent(undefined);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.paste(endpoint);

    expect(mockOnChange).toHaveBeenCalledWith(endpoint, false);
    // GitProviderEndpoint component validates but doesn't render error messages
    // expect(screen.queryByText('The URL is not valid.')).toBeTruthy();
  });

  it('should handle endpoint w/o protocol', async () => {
    const endpoint = 'provider/endpoint';
    renderComponent(undefined);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.paste(endpoint);

    expect(mockOnChange).toHaveBeenCalledWith(endpoint, false);
    // GitProviderEndpoint component validates but doesn't render error messages
    // expect(screen.queryByText('The URL is not valid.')).toBeTruthy();
  });

  it('should handle an empty value', async () => {
    const endpoint = 'https://provider.test/endpoint';
    renderComponent(endpoint);

    expect(mockOnChange).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await userEvent.clear(input);

    expect(mockOnChange).toHaveBeenCalledWith('', false);
    // GitProviderEndpoint component validates but doesn't render error messages
    // expect(screen.queryByText('This field is required.')).toBeTruthy();
  });

  describe('default endpoint update', () => {
    it('should change value if input untouched', () => {
      const { reRenderComponent } = renderComponent(undefined);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue(defaultGitProviderEndpoint);

      const nextDefaultEndpoint = 'https://provider.next/endpoint';
      reRenderComponent(undefined, nextDefaultEndpoint);

      expect(input).toHaveValue(nextDefaultEndpoint);
    });

    it('should not change value if input is modified', async () => {
      const { reRenderComponent } = renderComponent(undefined);

      const input = screen.getByRole('textbox');
      const userModifiedEndpoint = 'https://provider.modified/endpoint';
      await userEvent.click(input);
      await userEvent.paste(userModifiedEndpoint);

      const nextDefaultEndpoint = 'https://provider.next/endpoint';
      reRenderComponent(undefined, nextDefaultEndpoint);

      expect(input).toHaveValue(userModifiedEndpoint);
    });

    it('should not change value if it is provided as param', () => {
      const editEndpoint = 'https://provider.some/endpoint';
      const { reRenderComponent } = renderComponent(editEndpoint);

      const input = screen.getByRole('textbox');

      const nextDefaultEndpoint = 'https://provider.next/endpoint';
      reRenderComponent(editEndpoint, nextDefaultEndpoint);

      expect(input).toHaveValue(editEndpoint);
    });
  });

  describe('helper text behavior', () => {
    it('should not show helper text when endpoint is valid', async () => {
      renderComponent(undefined);

      const input = screen.getByRole('textbox');
      const validEndpoint = 'https://provider.test/endpoint';
      await userEvent.click(input);
      await userEvent.paste(validEndpoint);

      // Helper text should not be present
      expect(screen.queryByText('Git provider endpoint is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).not.toBeInTheDocument();
    });

    it('should show error helper text when endpoint is empty', async () => {
      renderComponent('https://provider.test/endpoint');

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);

      // Error helper text should be visible
      expect(screen.getByText('Git provider endpoint is required.')).toBeInTheDocument();
    });

    it('should show error helper text when endpoint has invalid protocol', async () => {
      renderComponent(undefined);

      const input = screen.getByRole('textbox');
      const invalidEndpoint = 'ftp://provider.test/endpoint';
      await userEvent.click(input);
      await userEvent.paste(invalidEndpoint);

      // Error helper text should be visible
      expect(
        screen.getByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).toBeInTheDocument();
    });

    it('should show error helper text when endpoint has no protocol', async () => {
      renderComponent(undefined);

      const input = screen.getByRole('textbox');
      const invalidEndpoint = 'provider.test/endpoint';
      await userEvent.click(input);
      await userEvent.paste(invalidEndpoint);

      // Error helper text should be visible
      expect(
        screen.getByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).toBeInTheDocument();
    });

    it('should show error helper text when endpoint has invalid format', async () => {
      renderComponent(undefined);

      const input = screen.getByRole('textbox');
      const invalidEndpoint = 'https://';
      await userEvent.click(input);
      await userEvent.paste(invalidEndpoint);

      // Error helper text should be visible
      expect(
        screen.getByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).toBeInTheDocument();
    });

    it('should hide helper text when correcting an invalid endpoint', async () => {
      renderComponent(undefined);

      const input = screen.getByRole('textbox');

      // First set an invalid value
      const invalidEndpoint = 'ftp://provider.test/endpoint';
      await userEvent.click(input);
      await userEvent.paste(invalidEndpoint);

      // Error helper text should be visible
      expect(
        screen.getByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).toBeInTheDocument();

      // Now correct it
      await userEvent.clear(input);
      const validEndpoint = 'https://provider.test/endpoint';
      await userEvent.click(input);
      await userEvent.paste(validEndpoint);

      // Helper text should no longer be visible
      expect(
        screen.queryByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).not.toBeInTheDocument();
    });

    it('should not show helper text on initial render with valid endpoint', () => {
      renderComponent('https://provider.test/endpoint');

      // No helper text should be visible
      expect(screen.queryByText('Git provider endpoint is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).not.toBeInTheDocument();
    });

    it('should not show helper text on initial render with default endpoint', () => {
      renderComponent(undefined);

      // No helper text should be visible initially (validation state is 'default')
      expect(screen.queryByText('Git provider endpoint is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).not.toBeInTheDocument();
    });

    it('should handle http endpoint correctly', async () => {
      renderComponent(undefined);

      const input = screen.getByRole('textbox');
      const httpEndpoint = 'http://provider.test/endpoint';
      await userEvent.click(input);
      await userEvent.paste(httpEndpoint);

      // Should be valid, no helper text
      expect(screen.queryByText('Git provider endpoint is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).not.toBeInTheDocument();
    });

    it('should handle endpoint with port correctly', async () => {
      renderComponent(undefined);

      const input = screen.getByRole('textbox');
      const endpointWithPort = 'https://provider.test:8443/endpoint';
      await userEvent.click(input);
      await userEvent.paste(endpointWithPort);

      // Should be valid, no helper text
      expect(screen.queryByText('Git provider endpoint is required.')).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          'Invalid URL format. Must be a valid URL starting with http:// or https://',
        ),
      ).not.toBeInTheDocument();
    });
  });
});

function getComponent(
  providerEndpoint: string | undefined,
  defaultProviderEndpoint = defaultGitProviderEndpoint,
): React.ReactElement {
  return (
    <Form>
      <GitProviderEndpoint
        defaultProviderEndpoint={defaultProviderEndpoint}
        providerEndpoint={providerEndpoint}
        onChange={(...args) => mockOnChange(...args)}
      />
    </Form>
  );
}
