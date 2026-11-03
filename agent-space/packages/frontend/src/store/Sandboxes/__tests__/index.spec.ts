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

import { buildSandbox, DEFAULT_FORM_DATA } from '@/services/sandboxFactory';
import { Sandbox, SandboxClientError, SandboxWatchListener } from '@/services/types';
import {
  sandboxesActionCreators,
  selectSandboxActionError,
  selectSandboxActionPendingName,
  selectSandboxes,
  selectSandboxesDeletingNames,
  selectSandboxesError,
  selectSandboxesIsLoading,
} from '@/store/Sandboxes';
import { createTestStore, TEST_NAMESPACE, testClient } from '@/testUtils';

function newSandbox(name = 'new-agent'): Sandbox {
  return buildSandbox({ ...DEFAULT_FORM_DATA, name }, TEST_NAMESPACE);
}

/** A sandbox the controller has already taken down, as a restart waits for. */
function suspendedSandbox(name: string): Sandbox {
  const sandbox = newSandbox(name);
  return { ...sandbox, spec: { ...sandbox.spec, operatingMode: 'Suspended' } };
}

/**
 * Longest a restart can spend waiting on the suspend, so a test can run the
 * whole thunk through without knowing how many times it reads the sandbox.
 */
const RESTART_TIMEOUT_MS = 30_000;

describe('the Sandboxes slice', () => {
  it('reports loading until the first answer arrives', async () => {
    const store = createTestStore();
    expect(selectSandboxesIsLoading(store.getState())).toBe(true);

    await store.dispatch(sandboxesActionCreators.requestSandboxes());

    expect(selectSandboxesIsLoading(store.getState())).toBe(false);
    expect(selectSandboxes(store.getState()).length).toBeGreaterThan(0);
  });

  it('does not claim to be loading while refreshing an already rendered list', async () => {
    const client = testClient();
    const store = createTestStore({ client });
    await store.dispatch(sandboxesActionCreators.requestSandboxes());

    // Polling must not blank the table, so a second request stays quiet.
    const pending = store.dispatch(sandboxesActionCreators.requestSandboxes());
    expect(selectSandboxesIsLoading(store.getState())).toBe(false);
    await pending;
  });

  it('records a failed load and stops showing the spinner', async () => {
    const client = testClient();
    jest
      .spyOn(client, 'listSandboxes')
      .mockRejectedValue(new SandboxClientError(403, 'Forbidden.'));
    const store = createTestStore({ client });

    await store.dispatch(sandboxesActionCreators.requestSandboxes());

    expect(selectSandboxesIsLoading(store.getState())).toBe(false);
    expect(selectSandboxesError(store.getState())).toEqual({
      message: 'Forbidden.',
      statusCode: 403,
    });
  });

  it('keeps the last good list when a refresh fails', async () => {
    const client = testClient();
    const store = createTestStore({ client });
    await store.dispatch(sandboxesActionCreators.requestSandboxes());
    const loaded = selectSandboxes(store.getState());

    jest.spyOn(client, 'listSandboxes').mockRejectedValue(new Error('network down'));
    await store.dispatch(sandboxesActionCreators.requestSandboxes());

    expect(selectSandboxes(store.getState())).toEqual(loaded);
    expect(selectSandboxesError(store.getState())).toEqual({ message: 'network down' });
  });

  describe('the namespace watch', () => {
    it('lists first, then subscribes from the version it just read', async () => {
      const client = testClient();
      const watchSpy = jest.spyOn(client, 'watchSandboxes');
      const store = createTestStore({ client });

      await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());

      expect(selectSandboxes(store.getState()).length).toBeGreaterThan(0);
      expect(watchSpy).toHaveBeenCalledWith(
        TEST_NAMESPACE,
        store.getState().sandboxes.resourceVersion,
        expect.any(Function),
      );

      store.dispatch(sandboxesActionCreators.stopWatchingSandboxes());
    });

    it('applies the changes the watch reports', async () => {
      const client = testClient();
      const store = createTestStore({ client });
      await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());
      const before = selectSandboxes(store.getState()).length;

      await client.createSandbox(TEST_NAMESPACE, newSandbox('watched'));

      expect(selectSandboxes(store.getState())).toHaveLength(before + 1);

      await client.deleteSandbox(TEST_NAMESPACE, 'watched');

      expect(
        selectSandboxes(store.getState()).find(s => s.metadata.name === 'watched'),
      ).toBeUndefined();

      store.dispatch(sandboxesActionCreators.stopWatchingSandboxes());
    });

    it('lists again when the watch reports a break', async () => {
      const client = testClient();
      let notify: SandboxWatchListener = () => undefined;
      jest.spyOn(client, 'watchSandboxes').mockImplementation((_ns, _version, listener) => {
        notify = listener;
        return () => undefined;
      });
      const store = createTestStore({ client });
      await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());
      const listSpy = jest.spyOn(client, 'listSandboxes');

      notify({ type: 'ERROR', message: 'the connection dropped' });

      expect(listSpy).toHaveBeenCalledTimes(1);
      store.dispatch(sandboxesActionCreators.stopWatchingSandboxes());
    });

    it('closes the previous subscription before opening another', async () => {
      const client = testClient();
      const stop = jest.fn();
      jest.spyOn(client, 'watchSandboxes').mockReturnValue(stop);
      const store = createTestStore({ client });

      await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());
      await store.dispatch(sandboxesActionCreators.startWatchingSandboxes());
      expect(stop).toHaveBeenCalledTimes(1);

      store.dispatch(sandboxesActionCreators.stopWatchingSandboxes());
      expect(stop).toHaveBeenCalledTimes(2);
    });
  });

  it('applies a lifecycle action in the bootstrapped namespace', async () => {
    const client = testClient();
    const patchSpy = jest.spyOn(client, 'patchSandbox');
    const store = createTestStore({ client });

    await store.dispatch(sandboxesActionCreators.runSandboxAction('hello-world', 'suspend'));

    expect(patchSpy).toHaveBeenCalledWith(TEST_NAMESPACE, 'hello-world', {
      spec: { operatingMode: 'Suspended' },
    });
    expect(selectSandboxActionPendingName(store.getState())).toBeUndefined();
  });

  describe('restart', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    /** Drives the thunk forward past the pauses between its reads. */
    async function runRestart(client: ReturnType<typeof testClient>, name: string): Promise<void> {
      const store = createTestStore({ client });
      const pending = store.dispatch(sandboxesActionCreators.runSandboxAction(name, 'restart'));

      await jest.advanceTimersByTimeAsync(RESTART_TIMEOUT_MS);
      await pending;
    }

    it('takes the sandbox down and brings it back up', async () => {
      const client = testClient();
      const patchSpy = jest.spyOn(client, 'patchSandbox');

      await runRestart(client, 'hello-world');

      // Re-asserting 'Running' on its own would be a no-op, so the suspend
      // has to come first and has to come separately.
      expect(patchSpy.mock.calls.map(([, , patch]) => patch)).toEqual([
        { spec: { operatingMode: 'Suspended' } },
        { spec: { operatingMode: 'Running' } },
      ]);
    });

    it('resumes only after the controller reports the sandbox suspended', async () => {
      const client = testClient();
      const order: string[] = [];
      jest.spyOn(client, 'patchSandbox').mockImplementation(async (_ns, _name, patch) => {
        order.push(`patch:${patch.spec?.operatingMode}`);
        return newSandbox('hello-world');
      });
      jest.spyOn(client, 'getSandbox').mockImplementation(async () => {
        order.push('read');
        return suspendedSandbox('hello-world');
      });

      await runRestart(client, 'hello-world');

      expect(order).toEqual(['patch:Suspended', 'read', 'patch:Running']);
    });

    it('resumes anyway when the sandbox never reports itself suspended', async () => {
      const client = testClient();
      const patchSpy = jest.spyOn(client, 'patchSandbox');
      // A sandbox stuck mid-suspend must not be left switched off.
      jest.spyOn(client, 'getSandbox').mockResolvedValue(newSandbox('hello-world'));

      await runRestart(client, 'hello-world');

      expect(patchSpy).toHaveBeenLastCalledWith(TEST_NAMESPACE, 'hello-world', {
        spec: { operatingMode: 'Running' },
      });
    });

    it('reports a restart the cluster refused', async () => {
      const client = testClient();
      jest.spyOn(client, 'patchSandbox').mockRejectedValue(new SandboxClientError(403, 'Denied.'));
      const store = createTestStore({ client });

      const pending = store.dispatch(
        sandboxesActionCreators.runSandboxAction('hello-world', 'restart'),
      );
      await jest.advanceTimersByTimeAsync(RESTART_TIMEOUT_MS);
      await pending;

      expect(selectSandboxActionError(store.getState())).toEqual({
        message: 'Denied.',
        statusCode: 403,
      });
    });
  });

  it('records a failed action without touching the list', async () => {
    const client = testClient();
    const store = createTestStore({ client });
    await store.dispatch(sandboxesActionCreators.requestSandboxes());
    jest.spyOn(client, 'patchSandbox').mockRejectedValue(new SandboxClientError(409, 'Conflict.'));

    await store.dispatch(sandboxesActionCreators.runSandboxAction('hello-world', 'suspend'));

    expect(selectSandboxActionError(store.getState())).toEqual({
      message: 'Conflict.',
      statusCode: 409,
    });
    expect(selectSandboxesError(store.getState())).toBeUndefined();
    expect(selectSandboxes(store.getState()).length).toBeGreaterThan(0);
  });

  it('forgets the action error on request so a retry starts clean', async () => {
    const client = testClient();
    const store = createTestStore({ client });
    jest.spyOn(client, 'patchSandbox').mockRejectedValueOnce(new Error('transient'));
    await store.dispatch(sandboxesActionCreators.runSandboxAction('hello-world', 'suspend'));
    expect(selectSandboxActionError(store.getState())).toBeDefined();

    await store.dispatch(sandboxesActionCreators.runSandboxAction('hello-world', 'suspend'));

    expect(selectSandboxActionError(store.getState())).toBeUndefined();
  });

  it('lets the user dismiss the action error', async () => {
    const client = testClient();
    jest.spyOn(client, 'deleteSandbox').mockRejectedValue(new Error('nope'));
    const store = createTestStore({ client });
    await store.dispatch(sandboxesActionCreators.deleteSandbox('hello-world'));
    expect(selectSandboxActionError(store.getState())).toBeDefined();

    store.dispatch(sandboxesActionCreators.clearActionError());

    expect(selectSandboxActionError(store.getState())).toBeUndefined();
  });

  it('deletes a sandbox from the bootstrapped namespace', async () => {
    const client = testClient();
    const store = createTestStore({ client });

    await store.dispatch(sandboxesActionCreators.deleteSandbox('hello-world'));
    await store.dispatch(sandboxesActionCreators.requestSandboxes());

    expect(
      selectSandboxes(store.getState()).find(s => s.metadata.name === 'hello-world'),
    ).toBeUndefined();
  });

  it('deletes several sandboxes in one go', async () => {
    const client = testClient();
    const store = createTestStore({ client });

    await store.dispatch(
      sandboxesActionCreators.deleteSandboxes(['hello-world', 'openclaw-agent']),
    );
    await store.dispatch(sandboxesActionCreators.requestSandboxes());

    const names = selectSandboxes(store.getState()).map(s => s.metadata.name);
    expect(names).not.toContain('hello-world');
    expect(names).not.toContain('openclaw-agent');
    expect(selectSandboxesDeletingNames(store.getState())).toBeUndefined();
  });

  it('deletes the sandboxes it can and names the ones it cannot', async () => {
    const client = testClient();
    jest
      .spyOn(client, 'deleteSandbox')
      .mockRejectedValueOnce(new SandboxClientError(403, 'Not allowed.'));
    const store = createTestStore({ client });

    await store.dispatch(
      sandboxesActionCreators.deleteSandboxes(['hello-world', 'openclaw-agent']),
    );
    await store.dispatch(sandboxesActionCreators.requestSandboxes());

    expect(selectSandboxActionError(store.getState())?.message).toBe(
      'Failed to delete 1 of 2 sandboxes. hello-world: Not allowed.',
    );
    const names = selectSandboxes(store.getState()).map(s => s.metadata.name);
    expect(names).toContain('hello-world');
    expect(names).not.toContain('openclaw-agent');
  });

  it('reports the reason alone when a single deletion fails', async () => {
    const client = testClient();
    jest
      .spyOn(client, 'deleteSandbox')
      .mockRejectedValue(new SandboxClientError(403, 'Not allowed.'));
    const store = createTestStore({ client });

    await store.dispatch(sandboxesActionCreators.deleteSandboxes(['hello-world']));

    expect(selectSandboxActionError(store.getState())?.message).toBe('hello-world: Not allowed.');
  });

  it('names what it is deleting while the deletion is in flight', async () => {
    const client = testClient();
    let release = (): void => undefined;
    jest
      .spyOn(client, 'deleteSandbox')
      .mockImplementation(() => new Promise<void>(resolve => (release = resolve)));
    const store = createTestStore({ client });

    const deletion = store.dispatch(sandboxesActionCreators.deleteSandboxes(['hello-world']));
    expect(selectSandboxesDeletingNames(store.getState())).toEqual(['hello-world']);

    release();
    await deletion;

    expect(selectSandboxesDeletingNames(store.getState())).toBeUndefined();
  });

  it('resolves to the created sandbox so the caller can navigate to it', async () => {
    const client = testClient();
    const store = createTestStore({ client });

    const created = await store.dispatch(sandboxesActionCreators.createSandbox(newSandbox()));

    expect(created?.metadata.name).toBe('new-agent');
    await expect(client.getSandbox(TEST_NAMESPACE, 'new-agent')).resolves.toBeDefined();
  });

  it('resolves to undefined and records the error when the create fails', async () => {
    const client = testClient();
    jest
      .spyOn(client, 'createSandbox')
      .mockRejectedValue(new SandboxClientError(409, 'Already exists.'));
    const store = createTestStore({ client });

    const created = await store.dispatch(sandboxesActionCreators.createSandbox(newSandbox()));

    expect(created).toBeUndefined();
    expect(selectSandboxActionError(store.getState())).toEqual({
      message: 'Already exists.',
      statusCode: 409,
    });
  });
});
