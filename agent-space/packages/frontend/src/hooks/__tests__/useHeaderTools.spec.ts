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

import { renderHook, waitFor } from '@testing-library/react';

import { useHeaderTools } from '@/hooks/useHeaderTools';
import { ApplicationInfo, fetchApplications, fetchUsername } from '@/services/dashboard';

jest.mock('@/services/dashboard');

const mockFetchApplications = jest.mocked(fetchApplications);
const mockFetchUsername = jest.mocked(fetchUsername);

const CONSOLE_APP: ApplicationInfo = {
  url: 'https://console.example.com',
  title: 'OpenShift console',
  icon: '/dashboard/assets/console.svg',
};

describe('useHeaderTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchApplications.mockResolvedValue([]);
    mockFetchUsername.mockResolvedValue('');
  });

  it('starts empty, so no control is rendered before its data is known', () => {
    const { result } = renderHook(() => useHeaderTools());

    expect(result.current).toEqual({ applications: [], username: '' });
  });

  it('reports what the dashboard knows about the cluster and the user', async () => {
    mockFetchApplications.mockResolvedValue([CONSOLE_APP]);
    mockFetchUsername.mockResolvedValue('kubeadmin');

    const { result } = renderHook(() => useHeaderTools());

    await waitFor(() =>
      expect(result.current).toEqual({ applications: [CONSOLE_APP], username: 'kubeadmin' }),
    );
  });

  it('reads both only once, however often the component re-renders', async () => {
    const { result, rerender } = renderHook(() => useHeaderTools());
    await waitFor(() => expect(mockFetchUsername).toHaveBeenCalled());

    rerender();

    expect(result.current).toEqual({ applications: [], username: '' });
    expect(mockFetchApplications).toHaveBeenCalledTimes(1);
    expect(mockFetchUsername).toHaveBeenCalledTimes(1);
  });

  it('does not report after unmount', async () => {
    mockFetchUsername.mockResolvedValue('kubeadmin');

    const { result, unmount } = renderHook(() => useHeaderTools());
    unmount();

    await waitFor(() => expect(mockFetchUsername).toHaveBeenCalled());
    expect(result.current.username).toBe('');
  });
});
