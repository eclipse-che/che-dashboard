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

import React from 'react';

import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

import { Props, UsageDonut } from '..';

const GI = 1024 ** 3;

const { renderComponent } = getComponentRenderer((props: Props) => <UsageDonut {...props} />);

describe('UsageDonut', () => {
  test('loaded: shows the available size', () => {
    renderComponent({
      status: 'loaded',
      usage: { totalBytes: 10 * GI, usedBytes: 5.3 * GI, availableBytes: 4.7 * GI },
    });

    const donut = screen.getByTestId('storage-usage-donut');
    expect(donut).toHaveTextContent('4.7 Gi');
    expect(donut).toHaveTextContent('Available');
    expect(donut).toHaveAttribute('aria-label', '5.3 Gi used, 4.7 Gi available');
    expect(screen.getByTestId('storage-usage-used')).toBeTruthy();
  });

  test('stopped: asks to start the workspace', () => {
    renderComponent({ status: 'stopped' });

    const donut = screen.getByTestId('storage-usage-donut');
    expect(donut).toHaveTextContent('Start the');
    expect(donut).toHaveTextContent('workspace');
    expect(screen.queryByTestId('storage-usage-used')).toBeNull();
  });

  test('unavailable', () => {
    renderComponent({ status: 'unavailable' });

    expect(screen.getByTestId('storage-usage-donut')).toHaveTextContent('Usage');
    expect(screen.getByTestId('storage-usage-donut')).toHaveTextContent('unavailable');
  });

  test('loading', () => {
    renderComponent({ status: 'loading' });

    expect(screen.getByTestId('storage-usage-donut')).toHaveTextContent('Loading');
  });

  test.each([
    [5, ''],
    [8, 'usedWarning'],
    [9.5, 'usedDanger'],
  ])('%d Gi used of 10 Gi → class "%s"', (usedGi, className) => {
    renderComponent({
      status: 'loaded',
      usage: { totalBytes: 10 * GI, usedBytes: usedGi * GI, availableBytes: (10 - usedGi) * GI },
    });

    const used = screen.getByTestId('storage-usage-used');
    if (className) {
      expect(used.getAttribute('class')).toContain(className);
    } else {
      expect(used.getAttribute('class')).toEqual('used');
    }
  });
});
