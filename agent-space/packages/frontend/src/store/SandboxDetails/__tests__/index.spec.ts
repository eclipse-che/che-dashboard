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

import { buildActionPatch } from '@/services/sandbox';
import { SandboxClientError } from '@/services/types';
import {
  sandboxDetailsActionCreators,
  selectSandboxDetails,
  selectSandboxDetailsError,
  selectSandboxDetailsEvents,
  selectSandboxDetailsIsLoading,
  selectSandboxDetailsName,
  selectSandboxDetailsResourceVersion,
} from '@/store/SandboxDetails';
import { sandboxChangeAction, sandboxesActionCreators } from '@/store/Sandboxes';
import { createTestStore, TEST_NAMESPACE, testClient } from '@/testUtils';

describe('the SandboxDetails slice', () => {
  it('loads a sandbox together with its events', async () => {
    const store = createTestStore();

    await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

    const state = store.getState();
    expect(selectSandboxDetails(state)?.metadata.name).toBe('hello-world');
    expect(selectSandboxDetailsEvents(state).length).toBeGreaterThan(0);
    expect(selectSandboxDetailsIsLoading(state)).toBe(false);
  });

  it('still shows the sandbox when the user may not read events', async () => {
    const client = testClient();
    jest.spyOn(client, 'listEvents').mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
    const store = createTestStore({ client });

    await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

    const state = store.getState();
    expect(selectSandboxDetails(state)?.metadata.name).toBe('hello-world');
    expect(selectSandboxDetailsEvents(state)).toEqual([]);
    expect(selectSandboxDetailsError(state)).toBeUndefined();
  });

  it('records a failed load under the name that was asked for', async () => {
    const client = testClient();
    const store = createTestStore({ client });

    await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('does-not-exist'));

    const state = store.getState();
    expect(selectSandboxDetailsName(state)).toBe('does-not-exist');
    expect(selectSandboxDetails(state)).toBeUndefined();
    expect(selectSandboxDetailsError(state)?.statusCode).toBe(404);
  });

  it('drops the previous sandbox when another one is requested', async () => {
    const store = createTestStore();
    await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

    const pending = store.dispatch(
      sandboxDetailsActionCreators.requestSandboxDetails('openclaw-agent'),
    );

    // The previous manifest must not be shown under the new name.
    expect(selectSandboxDetails(store.getState())).toBeUndefined();
    expect(selectSandboxDetailsIsLoading(store.getState())).toBe(true);
    await pending;
    expect(selectSandboxDetails(store.getState())?.metadata.name).toBe('openclaw-agent');
  });

  it('does not flash the spinner while refreshing the same sandbox', async () => {
    const store = createTestStore();
    await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

    const pending = store.dispatch(
      sandboxDetailsActionCreators.requestSandboxDetails('hello-world'),
    );

    expect(selectSandboxDetailsIsLoading(store.getState())).toBe(false);
    await pending;
  });

  it('reads the sandbox from the bootstrapped namespace', async () => {
    const client = testClient();
    const getSpy = jest.spyOn(client, 'getSandbox');
    const store = createTestStore({ client });

    await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

    expect(getSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'hello-world');
  });

  it('exposes the resource version the page keys its event refresh on', async () => {
    const client = testClient();
    const store = createTestStore({ client });
    await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

    const sandbox = await client.getSandbox(TEST_NAMESPACE, 'hello-world');
    sandbox.metadata.resourceVersion = '77';
    store.dispatch(sandboxChangeAction({ type: 'MODIFIED', sandbox }));

    expect(selectSandboxDetailsResourceVersion(store.getState())).toBe('77');
  });

  describe('reacting to the namespace watch', () => {
    it('shows what the watch reports for the sandbox on screen', async () => {
      const client = testClient();
      const store = createTestStore({ client });
      await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

      await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());
      await client.patchSandbox(TEST_NAMESPACE, 'hello-world', buildActionPatch('suspend'));

      expect(selectSandboxDetails(store.getState())?.spec.operatingMode).toBe('Suspended');
      store.dispatch(sandboxesActionCreators.stopWatchingSandboxes());
    });

    it('clears the sandbox once the watch reports it deleted', async () => {
      const client = testClient();
      const store = createTestStore({ client });
      await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));
      const sandbox = selectSandboxDetails(store.getState());

      store.dispatch(sandboxChangeAction({ type: 'DELETED', sandbox: sandbox! }));

      expect(selectSandboxDetails(store.getState())).toBeUndefined();
    });

    it('ignores a change to another sandbox', async () => {
      const client = testClient();
      const store = createTestStore({ client });
      await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));

      const other = await client.getSandbox(TEST_NAMESPACE, 'openclaw-agent');
      store.dispatch(sandboxChangeAction({ type: 'DELETED', sandbox: other }));

      expect(selectSandboxDetails(store.getState())?.metadata.name).toBe('hello-world');
    });
  });

  describe('requestSandboxEvents', () => {
    it('replaces only the events of the sandbox on screen', async () => {
      const client = testClient();
      const store = createTestStore({ client });
      await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));
      jest.spyOn(client, 'listEvents').mockResolvedValue([{ uid: 'later', reason: 'Pulled' }]);

      await store.dispatch(sandboxDetailsActionCreators.requestSandboxEvents('hello-world'));

      expect(selectSandboxDetailsEvents(store.getState())).toEqual([
        { uid: 'later', reason: 'Pulled' },
      ]);
    });

    it('keeps the events on screen when it may not read them', async () => {
      const client = testClient();
      const store = createTestStore({ client });
      await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));
      const loaded = selectSandboxDetailsEvents(store.getState());
      jest.spyOn(client, 'listEvents').mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));

      await store.dispatch(sandboxDetailsActionCreators.requestSandboxEvents('hello-world'));

      expect(selectSandboxDetailsEvents(store.getState())).toEqual(loaded);
      expect(selectSandboxDetailsError(store.getState())).toBeUndefined();
    });

    it('drops an answer that arrives after the user moved on', async () => {
      const client = testClient();
      const store = createTestStore({ client });
      await store.dispatch(sandboxDetailsActionCreators.requestSandboxDetails('hello-world'));
      const loaded = selectSandboxDetailsEvents(store.getState());

      await store.dispatch(sandboxDetailsActionCreators.requestSandboxEvents('openclaw-agent'));

      expect(selectSandboxDetailsEvents(store.getState())).toEqual(loaded);
    });
  });
});
