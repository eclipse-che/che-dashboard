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
import { Provider } from 'react-redux';
import { Store } from 'redux';

import EditorTools from '@/components/EditorTools';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

// mute console.error
console.error = jest.fn();

jest.mock('@/contexts/ToggleBars');

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

const { renderComponent, createSnapshot } = getComponentRenderer(getComponent);

const mockOnExpand = jest.fn();
let store: Store;

describe('EditorTools', () => {
  beforeEach(() => {
    store = new MockStoreBuilder().build();

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Devfile', () => {
    const name = 'my-project';
    const devfileContent = dump({
      schemaVersion: '2.1.0',
      metadata: {
        name,
      },
    });

    test('snapshot', () => {
      const snapshot = createSnapshot(devfileContent, name);
      expect(snapshot.toJSON()).toMatchSnapshot();
    });

    test('expand and compress', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderComponent(devfileContent, name);

      /* expand the editor */

      const expandButtonName = 'Expand';
      expect(screen.getByRole('button', { name: expandButtonName })).toBeTruthy;

      const expandButton = screen.getByRole('button', { name: expandButtonName });
      await user.click(expandButton);

      expect(mockOnExpand).toHaveBeenCalledWith(true);

      /* compress the editor */

      const compressButtonName = 'Compress';
      expect(screen.getByRole('button', { name: compressButtonName })).toBeTruthy;

      const compressButton = screen.getByRole('button', { name: compressButtonName });
      await user.click(compressButton);

      expect(mockOnExpand).toHaveBeenCalledWith(false);
    });

    test('copy to clipboard', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const mockCreateObjectURL = jest.fn().mockReturnValue('blob-url');
      URL.createObjectURL = mockCreateObjectURL;

      renderComponent(devfileContent, name);

      const copyButtonName = 'Copy to clipboard';
      expect(screen.queryByRole('button', { name: copyButtonName })).toBeTruthy;

      const copyButton = screen.getByRole('button', { name: copyButtonName });
      await user.click(copyButton);

      expect(mockClipboard).toHaveBeenCalledWith(
        'schemaVersion: 2.1.0\nmetadata:\n  name: my-project\n',
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
  });
});

function getComponent(contentText: string, workspaceName: string) {
  return (
    <Provider store={store}>
      <EditorTools
        contentText={contentText}
        workspaceName={workspaceName}
        handleExpand={mockOnExpand}
      />
    </Provider>
  );
}
