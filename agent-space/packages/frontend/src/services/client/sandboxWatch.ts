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
  let stopped = false;
  // Only the first connection may resume from a known version. After a break
  // that version is likely too old for the API server, so the subscription
  // starts from the current state instead, which the watch replays as ADDED.
  let startVersion = resourceVersion;
  // Consecutive failed attempts, reset once a socket opens again. Drives both
  // the backoff and whether the break is worth reporting.
  let failures = 0;

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
      current.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          channel: SANDBOX_CHANNEL,
          params: { namespace, resourceVersion: startVersion },
        }),
      );
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
        listener({ type: message.eventPhase, sandbox: message.sandbox });
      } else if (isStatusNotification(message)) {
        listener({
          type: 'ERROR',
          message: message.status?.message ?? 'The sandbox watch reported an error.',
        });
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
    const current = socket;
    socket = undefined;
    try {
      current?.close();
    } catch {
      // The socket may never have opened; nothing to clean up then.
    }
  };
}
