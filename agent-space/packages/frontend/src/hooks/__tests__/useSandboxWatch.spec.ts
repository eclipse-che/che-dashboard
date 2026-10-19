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

import { useSandboxWatch } from '@/hooks/useSandboxWatch';
import { StopWatching } from '@/services/types';
import { storeWrapper, TEST_NAMESPACE, testClient } from '@/testUtils';

function watchedClient(stop: StopWatching = jest.fn()) {
  const client = testClient();
  const watchSpy = jest.spyOn(client, 'watchSandboxes').mockReturnValue(stop);
  return { client, watchSpy };
}

describe('useSandboxWatch', () => {
  it('opens the subscription once the bootstrap is done', async () => {
    const { client, watchSpy } = watchedClient();

    renderHook(() => useSandboxWatch(true), { wrapper: storeWrapper({ client }) });

    await waitFor(() => expect(watchSpy).toHaveBeenCalledTimes(1));
    expect(watchSpy.mock.calls[0][0]).toBe(TEST_NAMESPACE);
  });

  it('waits for the namespace before subscribing to anything', async () => {
    const { client, watchSpy } = watchedClient();

    renderHook(() => useSandboxWatch(false), { wrapper: storeWrapper({ client }) });

    await Promise.resolve();
    expect(watchSpy).not.toHaveBeenCalled();
  });

  it('closes the subscription when the application goes away', async () => {
    const stop = jest.fn();
    const { client, watchSpy } = watchedClient(stop);

    const { unmount } = renderHook(() => useSandboxWatch(true), {
      wrapper: storeWrapper({ client }),
    });
    await waitFor(() => expect(watchSpy).toHaveBeenCalled());

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
