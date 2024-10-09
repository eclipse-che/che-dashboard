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
import { EventPhase } from '@eclipse-che/common/lib/dto/api/webSocket';
import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import BannerAlertNoNodeAvailable from '@/components/BannerAlert/NoNodeAvailable';
import { container } from '@/inversify.config';
import { WebsocketClient } from '@/services/backend-client/websocketClient';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';

const text =
  '"FailedScheduling" event occurred. If cluster autoscaler is enabled it might be provisioning a new node now and workspace startup will take longer than usual.';
const websocketClient = container.get(WebsocketClient);
describe('BannerAlertNoNodeAvailable component', () => {
  it('should show alert when failedScheduling event is received and hide alert when workspace has started', async () => {
    const events = [
      {
        reason: 'FailedScheduling',
        message: 'No preemption victims found for incoming pod',
        metadata: { uid: 'uid' },
      } as any,
    ];

    renderComponent(new FakeStoreBuilder().withEvents({ events }).build());

    await waitFor(() => expect(screen.queryAllByText(text).length).toEqual(1));

    // Dispatch workspace started event to clear the state.
    await (websocketClient as any).messageHandler.listeners.get(
      api.webSocket.Channel.DEV_WORKSPACE,
    )![0]({
      devWorkspace: { status: { phase: 'Running' } },
    } as any);

    // wait banner to hide
    await new Promise(resolve => setTimeout(resolve, 1000));

    await waitFor(() => expect(screen.queryAllByText(text).length).toEqual(0));
  });

  it('should not show alert if user namespace event is undefined', async () => {
    const events = [{} as any];

    renderComponent(new FakeStoreBuilder().withEvents({ events }).build());

    await waitFor(() => expect(screen.queryAllByText(text).length).toEqual(0));
  });
});

function renderComponent(store: Store<any, any>): RenderResult {
  const component = (
    <Provider store={store}>
      <BannerAlertNoNodeAvailable />
    </Provider>
  );
  return render(<Provider store={store}>{component}</Provider>);
}
