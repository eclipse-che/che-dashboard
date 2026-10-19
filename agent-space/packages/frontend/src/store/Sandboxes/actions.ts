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

import { createAction } from '@reduxjs/toolkit';

import { getSandboxClient } from '@/services/client/instance';
import { buildActionPatch, getSandboxPhase } from '@/services/sandbox';
import {
  Sandbox,
  SandboxAction,
  SandboxChangeEvent,
  SandboxError,
  SandboxPhase,
  StopWatching,
  toSandboxError,
} from '@/services/types';
import { AppThunk } from '@/store';
import { selectNamespace } from '@/store/Bootstrap';

export interface SandboxesPayload {
  sandboxes: Sandbox[];
  /** Version of the collection the watch has to start from. */
  resourceVersion?: string;
}

export const sandboxesRequestAction = createAction('sandboxes/request');
export const sandboxesReceiveAction = createAction<SandboxesPayload>('sandboxes/receive');
export const sandboxesErrorAction = createAction<SandboxError>('sandboxes/receiveError');

/**
 * One change reported by the watch. Both the list and the details slice react
 * to it, which is what keeps the two views in step without either polling.
 */
export const sandboxChangeAction = createAction<SandboxChangeEvent>('sandboxes/change');

/**
 * The subscription handle. It is a live callback, so it cannot live in the
 * store, which must stay serializable.
 */
let stopWatching: StopWatching | undefined;

/**
 * How long {@link restartSandbox} waits for the controller to take the pod
 * down before it brings the sandbox back up.
 *
 * The condition only flips once the pod is actually gone, which took about
 * nine seconds against a local cluster; thirty leaves room for a container
 * that is slower to stop.
 */
const RESTART_SUSPEND_ATTEMPTS = 30;
const RESTART_SUSPEND_INTERVAL_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Restarts a sandbox by taking it down and bringing it back up.
 *
 * `spec.operatingMode` is the entire lifecycle API, and re-asserting `Running`
 * on a sandbox that already carries it does nothing at all: the pod runs under
 * `restartPolicy: Never`, so once it has failed nothing recreates it.
 * Suspending deletes the pod and resuming creates a fresh one, which is a
 * restart in two steps.
 *
 * The second step has to wait for the first. The controller reconciles against
 * the object it observes, so two patches sent back to back would leave it
 * seeing only `Running` and doing nothing. Waiting on the phase rather than on
 * a fixed pause also skips the moment mid-suspend where the sandbox briefly
 * reports `Finished=True` again.
 *
 * Resuming happens whether or not the wait succeeded: a sandbox left suspended
 * because the controller was slow would be a worse outcome than one restarted
 * late.
 */
async function restartSandbox(namespace: string, name: string): Promise<void> {
  const client = getSandboxClient();

  await client.patchSandbox(namespace, name, buildActionPatch('suspend'));

  for (let attempt = 0; attempt < RESTART_SUSPEND_ATTEMPTS; attempt++) {
    await delay(RESTART_SUSPEND_INTERVAL_MS);

    const sandbox = await client.getSandbox(namespace, name);
    if (getSandboxPhase(sandbox) === SandboxPhase.SUSPENDED) {
      break;
    }
  }

  await client.patchSandbox(namespace, name, buildActionPatch('resume'));
}

export const sandboxActionRequestAction = createAction<string>('sandboxes/action/request');
export const sandboxActionReceiveAction = createAction('sandboxes/action/receive');
export const sandboxActionErrorAction = createAction<SandboxError>('sandboxes/action/receiveError');
export const sandboxActionClearErrorAction = createAction('sandboxes/action/clearError');

/**
 * Bulk delete is tracked apart from the single-sandbox lifecycle actions: it
 * spans several names at once, and only the list page can start one.
 */
export const sandboxesDeleteRequestAction = createAction<string[]>('sandboxes/bulkDelete/request');
export const sandboxesDeleteReceiveAction = createAction('sandboxes/bulkDelete/receive');
export const sandboxesDeleteErrorAction = createAction<SandboxError>(
  'sandboxes/bulkDelete/receiveError',
);

export const actionCreators = {
  requestSandboxes:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        dispatch(sandboxesRequestAction());

        const list = await getSandboxClient().listSandboxes(selectNamespace(getState()));
        dispatch(
          sandboxesReceiveAction({
            sandboxes: list.items,
            resourceVersion: list.metadata?.resourceVersion,
          }),
        );
      } catch (e) {
        dispatch(sandboxesErrorAction(toSandboxError(e)));
      }
    },

  /**
   * Lists once, then subscribes to the changes of the namespace.
   *
   * The list comes first because the watch only reports what happens after the
   * `resourceVersion` it is given; without it the UI would start empty and fill
   * in only as sandboxes happened to change.
   */
  startWatchingSandboxes:
    (): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      stopWatching?.();
      stopWatching = undefined;

      await dispatch(actionCreators.requestSandboxes());

      const state = getState();
      const namespace = selectNamespace(state);
      const resourceVersion = state.sandboxes.resourceVersion ?? '';

      stopWatching = getSandboxClient().watchSandboxes(namespace, resourceVersion, event => {
        if (event.type === 'ERROR') {
          // Events may have been missed while the stream was down - a deletion
          // in particular is never replayed - so the collection is read again.
          void dispatch(actionCreators.requestSandboxes());
          return;
        }
        dispatch(sandboxChangeAction(event));
      });
    },

  stopWatchingSandboxes: (): AppThunk<void> => (): void => {
    stopWatching?.();
    stopWatching = undefined;
  },

  /**
   * Applies a lifecycle action. The resulting state is not guessed here: the
   * watch reports what the controller - not this UI - actually produced.
   */
  runSandboxAction:
    (name: string, action: SandboxAction): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        dispatch(sandboxActionRequestAction(name));

        const namespace = selectNamespace(getState());
        if (action === 'restart') {
          await restartSandbox(namespace, name);
        } else {
          await getSandboxClient().patchSandbox(namespace, name, buildActionPatch(action));
        }
        dispatch(sandboxActionReceiveAction());
      } catch (e) {
        dispatch(sandboxActionErrorAction(toSandboxError(e)));
      }
    },

  deleteSandbox:
    (name: string): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        dispatch(sandboxActionRequestAction(name));

        await getSandboxClient().deleteSandbox(selectNamespace(getState()), name);
        dispatch(sandboxActionReceiveAction());
      } catch (e) {
        dispatch(sandboxActionErrorAction(toSandboxError(e)));
      }
    },

  /**
   * Deletes several sandboxes at once.
   *
   * Every name is attempted even when an earlier one fails, so one sandbox the
   * user may no longer delete does not hide the outcome of the rest; what did
   * fail is then reported together.
   */
  deleteSandboxes:
    (names: string[]): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const namespace = selectNamespace(getState());
      const client = getSandboxClient();

      dispatch(sandboxesDeleteRequestAction(names));

      const results = await Promise.allSettled(
        names.map(name => client.deleteSandbox(namespace, name)),
      );
      const failures = results.flatMap((result, index) =>
        result.status === 'rejected'
          ? [`${names[index]}: ${toSandboxError(result.reason).message}`]
          : [],
      );

      if (failures.length === 0) {
        dispatch(sandboxesDeleteReceiveAction());
        return;
      }
      dispatch(
        sandboxesDeleteErrorAction({
          message:
            names.length === 1
              ? failures[0]
              : `Failed to delete ${failures.length} of ${names.length} sandboxes. ${failures.join('; ')}`,
        }),
      );
    },

  createSandbox:
    (sandbox: Sandbox): AppThunk<Promise<Sandbox | undefined>> =>
    async (dispatch, getState): Promise<Sandbox | undefined> => {
      try {
        dispatch(sandboxActionRequestAction(sandbox.metadata.name));

        const created = await getSandboxClient().createSandbox(
          selectNamespace(getState()),
          sandbox,
        );
        dispatch(sandboxActionReceiveAction());
        return created;
      } catch (e) {
        dispatch(sandboxActionErrorAction(toSandboxError(e)));
        return undefined;
      }
    },

  clearActionError: (): AppThunk<void> => dispatch => dispatch(sandboxActionClearErrorAction()),
};
