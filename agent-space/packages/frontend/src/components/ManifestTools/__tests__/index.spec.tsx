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

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ManifestTools } from '@/components/ManifestTools';

const MANIFEST = 'kind: Sandbox\n';
const BLOB_URL = 'blob:agent-space/manifest';

const writeText = jest.fn<Promise<void>, [string]>();
const createObjectURL = jest.fn<string, [Blob]>();
const revokeObjectURL = jest.fn<void, [string]>();

function renderTools(
  overrides: Partial<React.ComponentProps<typeof ManifestTools>> = {},
): { onExpand: jest.Mock } & ReturnType<typeof render> {
  const onExpand = jest.fn();
  const result = render(
    <ManifestTools
      contentText={MANIFEST}
      fileName="hello-world.sandbox.yaml"
      isExpanded={false}
      onExpand={onExpand}
      {...overrides}
    />,
  );
  return { onExpand, ...result };
}

beforeAll(() => {
  // JSDOM implements neither the clipboard nor object URLs.
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  writeText.mockResolvedValue(undefined);
  createObjectURL.mockReturnValue(BLOB_URL);
});

describe('ManifestTools', () => {
  describe('copying', () => {
    it('puts the manifest on the clipboard', async () => {
      renderTools();

      await userEvent.click(screen.getByTestId('copy-manifest-button'));

      expect(writeText).toHaveBeenCalledWith(MANIFEST);
      expect(await screen.findByText('Copied')).toBeInTheDocument();
    });

    it('says so when the browser refuses access to the clipboard', async () => {
      writeText.mockRejectedValue(new Error('Document is not focused.'));
      renderTools();

      await userEvent.click(screen.getByTestId('copy-manifest-button'));

      // Silence would look like a copy that worked, so the button offers the
      // keyboard route instead.
      expect(await screen.findByText('Press Ctrl+C to copy')).toBeInTheDocument();
    });

    it('goes back to offering a copy a few seconds later', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      renderTools();

      await userEvent.click(screen.getByTestId('copy-manifest-button'));
      expect(await screen.findByText('Copied')).toBeInTheDocument();

      act(() => jest.advanceTimersByTime(3000));

      await waitFor(() => expect(screen.getByText('Copy to clipboard')).toBeInTheDocument());
    });
  });

  describe('downloading', () => {
    it('offers the manifest as a YAML file named after the sandbox', () => {
      renderTools();

      const link = screen.getByTestId('download-manifest-button');
      expect(link).toHaveAttribute('download', 'hello-world.sandbox.yaml');
      expect(link).toHaveAttribute('href', BLOB_URL);
      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('releases the object URL once the tab is gone', () => {
      const { unmount } = renderTools();

      unmount();

      expect(revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
    });

    it('rebuilds the download when the manifest changes', () => {
      const { rerender } = renderTools();
      createObjectURL.mockReturnValue('blob:agent-space/updated');

      rerender(
        <ManifestTools
          contentText={'kind: Sandbox\nmetadata:\n  name: renamed\n'}
          fileName="hello-world.sandbox.yaml"
          isExpanded={false}
          onExpand={jest.fn()}
        />,
      );

      expect(revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
      expect(screen.getByTestId('download-manifest-button')).toHaveAttribute(
        'href',
        'blob:agent-space/updated',
      );
    });
  });

  describe('expanding', () => {
    it('asks to expand while compressed', async () => {
      const { onExpand } = renderTools();

      expect(screen.getByTestId('expand-manifest-button')).toHaveTextContent('Expand');
      await userEvent.click(screen.getByTestId('expand-manifest-button'));

      expect(onExpand).toHaveBeenCalledWith(true);
    });

    it('asks to compress while expanded', async () => {
      const { onExpand } = renderTools({ isExpanded: true });

      expect(screen.getByTestId('expand-manifest-button')).toHaveTextContent('Compress');
      await userEvent.click(screen.getByTestId('expand-manifest-button'));

      expect(onExpand).toHaveBeenCalledWith(false);
    });
  });
});
