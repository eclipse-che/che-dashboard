/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import BannerAlertNoNodeAvailable from '@/components/BannerAlert/NoNodeAvailable';
import { container } from '@/inversify.config';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';

const websocketClient = container.get(WebsocketClient);
const text =
  '"FailedScheduling" event occurred. If cluster autoscaler is enabled it might be provisioning a new node now and workspace startup will take longer than usual.';

describe('BannerAlertNoNodeAvailable component', () => {
  it('should show alert when failedScheduling event is received and hide alert when workspace has started', async () => {
    renderComponent();

    // Dispatch FailedScheduling event to add workspace to the state.
    (websocketClient as any).messageHandler.listeners.get(api.webSocket.Channel.EVENT)![0]({
      event: {
        reason: 'FailedScheduling',
        message: 'No preemption victims found for incoming pod',
        metadata: { uid: 'uid' },
      },
    } as any);
    await waitFor(() => expect(screen.queryAllByText(text).length).toEqual(1));

    // Dispatch workspace started event to clear the state.
    (websocketClient as any).messageHandler.listeners.get(api.webSocket.Channel.DEV_WORKSPACE)![0]({
      devWorkspace: { status: { phase: 'Running' } },
    } as any);

    // wait banner to hide
    await new Promise(resolve => setTimeout(resolve, 1000));

    await waitFor(() => expect(screen.queryAllByText(text).length).toEqual(0));
  });

  it('should not show alert if user namespace event is undefined', async () => {
    renderComponent();
    (websocketClient as any).messageHandler.listeners.get(api.webSocket.Channel.EVENT)![0]({
      event: {} as any,
    });
    await waitFor(() => expect(screen.queryAllByText(text).length).toEqual(0));
  });
});

function renderComponent(): RenderResult {
  const store = new FakeStoreBuilder().build();
  const component = (
    <Provider store={store}>
      <BannerAlertNoNodeAvailable />
    </Provider>
  );
  return render(<Provider store={store}>{component}</Provider>);
}
