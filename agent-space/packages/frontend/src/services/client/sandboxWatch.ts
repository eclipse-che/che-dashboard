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

import { Sandbox, SandboxWatchListener, StopWatching } from '@/services/types';

/** Channel name of the dashboard backend's sandbox watch. */
const SANDBOX_CHANNEL = 'sandbox';

/** How long to wait before reopening a socket that dropped the first time. */
export const RECONNECT_DELAY_MS = 3000;

/**
 * How long to wait before subscribing again after the backend reported that
 * its own watch ended.
 *
 * Short, because this is the common case rather than a failure: the API server
 * closes a watch every few minutes, and until the subscription is renewed the
 * page shows a state that no longer changes.
 */
export const RESUBSCRIBE_DELAY_MS = 1000;

/**
 * Ceiling for the backoff. A backend that is down for a while - a pod restart,
 * a revoked token - would otherwise be hammered every three seconds for as
 * long as the tab stays open, and each attempt costs the caller a full list.
 */
export const MAX_RECONNECT_DELAY_MS = 60_000;

type EventPhase = 'ADDED' | 'MODIFIED' | 'DELETED' | 'ERROR';

type SandboxNotification = {
  eventPhase: 'ADDED' | 'MODIFIED' | 'DELETED';
  sandbox: Sandbox;
};

type StatusNotification = {
  eventPhase: 'ERROR';
  status?: { message?: string; reason?: string };
};

type EventData = {
  channel: string;
  message: SandboxNotification | StatusNotification;
};

/** Minimal surface of the browser `WebSocket` this module relies on. */
export interface WatchSocket {
  send(data: string): void;
  close(): void;
  onopen: ((this: unknown, event: unknown) => void) | null;
  onmessage: ((this: unknown, event: { data: unknown }) => void) | null;
  onclose: ((this: unknown, event: unknown) => void) | null;
  onerror: ((this: unknown, event: unknown) => void) | null;
}

export type SocketFactory = (url: string) => WatchSocket;

function isEventData(payload: unknown): payload is EventData {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const { channel, message } = payload as EventData;
  return typeof channel === 'string' && typeof message === 'object' && message !== null;
}

function isSandboxNotification(message: unknown): message is SandboxNotification {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const { eventPhase, sandbox } = message as SandboxNotification;
  return (
    (eventPhase === 'ADDED' || eventPhase === 'MODIFIED' || eventPhase === 'DELETED') &&
    typeof sandbox === 'object' &&
    sandbox !== null
  );
}

function isStatusNotification(message: unknown): message is StatusNotification {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { eventPhase?: EventPhase }).eventPhase === 'ERROR'
  );
}

/**
 * Builds the absolute URL of the dashboard backend's WebSocket endpoint.
 *
 * Agent Space is served from the same origin as the dashboard, so the page's
 * own scheme and host decide; only the scheme has to be swapped.
 */
export function buildWebSocketUrl(path: string, location = window.location): string {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}${path}`;
}

/**
 * Subscribes to the sandbox channel and keeps the subscription alive.
 *
 * A dropped socket is reopened after {@link RECONNECT_DELAY_MS}, and the
 * listener is told about the break so the caller can list again: events that
 * happened while the socket was down - a deletion in particular - are not
 * replayed, and only a fresh list can make the UI whole again.
 *
 * A watch can also end while the socket stays open. The API server closes
 * watches periodically, which reaches the backend as a premature close and the
 * browser as an ERROR notification: nothing about the socket changed, so
 * reopening it is not what is needed - the channel has to be subscribed to
 * again, which is what {@link RESUBSCRIBE_DELAY_MS} drives.
 */
export function watchSandboxes(
  url: string,
  namespace: string,
  resourceVersion: string,
  listener: SandboxWatchListener,
  createSocket: SocketFactory = target => new WebSocket(target) as WatchSocket,
): StopWatching {
  let socket: WatchSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let resubscribeTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  // Only the first connection may resume from a known version. After a break
  // that version is likely too old for the API server, so the subscription
  // starts from the current state instead, which the watch replays as ADDED.
  let startVersion = resourceVersion;
  // Consecutive failed attempts, reset once a socket opens again. Drives both
  // the backoff and whether the break is worth reporting.
  let failures = 0;
  // Consecutive watches that ended without ever delivering an event. A watch
  // the API server simply timed out resets this, so the usual renewal stays
  // immediate; a subscription the backend refuses outright - no permission on
  // the namespace, say - backs off instead of spinning.
  let watchFailures = 0;

  function subscribe(target: WatchSocket): void {
    target.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        channel: SANDBOX_CHANNEL,
        params: { namespace, resourceVersion: startVersion },
      }),
    );
  }

  /**
   * Renews a subscription whose server-side watch ended.
   *
   * The new watch starts from the current state rather than from the version
   * the old one reached: that version may already be too old for the API
   * server, and the caller answers the same ERROR with a full list, which is
   * what covers whatever happened in between.
   */
  function scheduleResubscribe(target: WatchSocket): void {
    startVersion = '';

    const delay = Math.min(RESUBSCRIBE_DELAY_MS * 2 ** watchFailures, MAX_RECONNECT_DELAY_MS);
    watchFailures += 1;

    if (resubscribeTimer !== undefined) {
      clearTimeout(resubscribeTimer);
    }
    resubscribeTimer = setTimeout(() => {
      resubscribeTimer = undefined;
      // A socket that was replaced or closed in the meantime is reconnected by
      // `onclose`, which subscribes on its own.
      if (stopped || socket !== target) {
        return;
      }
      subscribe(target);
    }, delay);
  }

  function connect(): void {
    if (stopped) {
      return;
    }

    let current: WatchSocket;
    try {
      current = createSocket(url);
    } catch (e) {
      scheduleReconnect(e instanceof Error ? e.message : String(e));
      return;
    }
    socket = current;

    current.onopen = () => {
      failures = 0;
      subscribe(current);
    };

    current.onmessage = event => {
      if (stopped || typeof event.data !== 'string') {
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!isEventData(payload) || payload.channel !== SANDBOX_CHANNEL) {
        return;
      }

      const { message } = payload;
      if (isSandboxNotification(message)) {
        // The watch is delivering, so whatever ended the previous one was a
        // timeout rather than a subscription the backend cannot serve.
        watchFailures = 0;
        listener({ type: message.eventPhase, sandbox: message.sandbox });
      } else if (isStatusNotification(message)) {
        listener({
          type: 'ERROR',
          message: message.status?.message ?? 'The sandbox watch reported an error.',
        });
        // The socket is still open and still carries the channel; only the
        // watch behind it is gone. Without a new subscription every later
        // change would go unnoticed until the page is reloaded.
        scheduleResubscribe(current);
      }
    };

    current.onerror = () => {
      // `onclose` always follows, and that is where the reconnect is driven
      // from; reporting here as well would duplicate every break.
    };

    current.onclose = () => {
      if (stopped || socket !== current) {
        return;
      }
      scheduleReconnect('The connection to the sandbox watch was lost.');
    };
  }

  function scheduleReconnect(message: string): void {
    socket = undefined;
    startVersion = '';

    // Report the first break of a streak only. The caller answers an ERROR
    // with a full list, which is the right thing to do once - deletions are
    // never replayed - but pointless on every retry of a backend that is
    // simply down, and the second list would fail the same way anyway.
    if (failures === 0) {
      listener({ type: 'ERROR', message });
    }

    const delay = Math.min(RECONNECT_DELAY_MS * 2 ** failures, MAX_RECONNECT_DELAY_MS);
    failures += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    if (resubscribeTimer !== undefined) {
      clearTimeout(resubscribeTimer);
      resubscribeTimer = undefined;
    }
    const current = socket;
    socket = undefined;
    try {
      current?.close();
    } catch {
      // The socket may never have opened; nothing to clean up then.
    }
  };
}
