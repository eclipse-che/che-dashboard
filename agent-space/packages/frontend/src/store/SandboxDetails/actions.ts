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
import { buildAiToolsPatch, SandboxCustomization } from '@/services/sandboxFactory';
import { Sandbox, SandboxError, SandboxEvent, toSandboxError } from '@/services/types';
import { AppThunk } from '@/store';
import { selectNamespace } from '@/store/Bootstrap';
import { selectAiTools } from '@/store/Catalog';
import { selectSandboxDetails } from '@/store/SandboxDetails/selectors';

export interface SandboxDetailsPayload {
  name: string;
  sandbox: Sandbox;
  events: SandboxEvent[];
  /** Why the events are missing, when listing them is what failed. */
  eventsError?: SandboxError;
}

export interface SandboxDetailsErrorPayload {
  name: string;
  error: SandboxError;
}

export interface SandboxDetailsEventsPayload {
  name: string;
  events: SandboxEvent[];
}

export const sandboxDetailsRequestAction = createAction<string>('sandboxDetails/request');

export const sandboxDetailsReceiveAction =
  createAction<SandboxDetailsPayload>('sandboxDetails/receive');
export const sandboxDetailsErrorAction = createAction<SandboxDetailsErrorPayload>(
  'sandboxDetails/receiveError',
);
export const sandboxDetailsEventsReceiveAction = createAction<SandboxDetailsEventsPayload>(
  'sandboxDetails/receiveEvents',
);
export const sandboxDetailsEventsErrorAction = createAction<SandboxDetailsErrorPayload>(
  'sandboxDetails/receiveEventsError',
);
export const sandboxDetailsUpdateAction = createAction<Sandbox>('sandboxDetails/update');

export const actionCreators = {
  /**
   * Loads one sandbox together with its events.
   *
   * Event listing is best effort: a user who may read Sandboxes but not Events
   * should still see the spec and the conditions.
   */
  requestSandboxDetails:
    (name: string): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      const namespace = selectNamespace(getState());
      const client = getSandboxClient();

      try {
        dispatch(sandboxDetailsRequestAction(name));

        const sandbox = await client.getSandbox(namespace, name);

        let events: SandboxEvent[] = [];
        let eventsError: SandboxError | undefined;
        try {
          events = await client.listEvents(namespace, name);
        } catch (e) {
          // Recorded rather than swallowed: an empty Events tab that means
          // "not allowed to look" must not read as "nothing happened".
          eventsError = toSandboxError(e);
        }

        dispatch(sandboxDetailsReceiveAction({ name, sandbox, events, eventsError }));
      } catch (e) {
        dispatch(sandboxDetailsErrorAction({ name, error: toSandboxError(e) }));
      }
    },

  /**
   * Re-reads only the events.
   *
   * Most of what lands here is reported against the Pod - pulls, back-offs,
   * scheduling - and none of that touches the Sandbox the watch follows, so
   * the watch cannot be the only thing that triggers a re-read. The details
   * page also calls this on a timer while the Events tab is open.
   */
  requestSandboxEvents:
    (name: string): AppThunk =>
    async (dispatch, getState): Promise<void> => {
      try {
        const events = await getSandboxClient().listEvents(selectNamespace(getState()), name);
        dispatch(sandboxDetailsEventsReceiveAction({ name, events }));
      } catch (e) {
        // The spec and the conditions are already on screen and stay there;
        // only the events pane reports this.
        dispatch(sandboxDetailsEventsErrorAction({ name, error: toSandboxError(e) }));
      }
    },

  /**
   * Changes the agents installed in a sandbox that already exists.
   *
   * The pod is replaced by the controller, so the change only takes effect on
   * the next start - the page says so, this only records the choice. Rejected
   * by the API server rather than reported here when the user may not patch.
   */
  updateSandboxAiTools:
    (customization: SandboxCustomization): AppThunk<Promise<void>> =>
    async (dispatch, getState): Promise<void> => {
      const state = getState();
      const sandbox = selectSandboxDetails(state);
      if (sandbox === undefined) {
        return;
      }
      const name = sandbox.metadata.name;
      const namespace = selectNamespace(state);

      try {
        const patch = buildAiToolsPatch(sandbox, customization, selectAiTools(state));
        const updated = await getSandboxClient().patchSandbox(namespace, name, patch);
        dispatch(sandboxDetailsUpdateAction(updated));
      } catch (e) {
        dispatch(sandboxDetailsErrorAction({ name, error: toSandboxError(e) }));
      }
    },
};
