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

/**
 * Client for the dashboard's sandbox terminal relay.
 *
 * The relay runs on the dashboard's own origin and reaches the sandbox pod
 * through the Kubernetes `pods/exec` subresource, so there is no second
 * hostname to reach and nothing extra running inside the sandbox.
 *
 * The frame constants mirror `routes/api/sandboxTerminal.ts` in the backend.
 * Agent Space does not depend on `@eclipse-che/common`, by design, so the two
 * ends spell the protocol out separately; it is three characters and changing
 * one without the other breaks the first test that opens a terminal.
 */

/** Frames this client sends. */
const CLIENT_FRAME = {
  INPUT: '0',
  RESIZE: '1',
} as const;

/** Frames this client receives. */
const SERVER_FRAME = {
  OUTPUT: '0',
  ERROR: '1',
  READY: '2',
} as const;

export interface TerminalHandlers {
  /** Output from the shell, to be written to the terminal as it arrives. */
  onData(chunk: string): void;

  /** The shell is attached; keystrokes now reach it. */
  onReady(): void;

  /** The session ended. A reason is given when it ended badly. */
  onClose(reason: string | undefined): void;
}

export interface TerminalConnection {
  send(data: string): void;
  resize(cols: number, rows: number): void;
  close(): void;
}

/**
 * The address of the relay for one sandbox.
 *
 * It is derived from the page's own origin rather than configured, because the
 * relay is served by the dashboard that served this bundle. `wss` follows
 * `https`, so a cluster behind TLS does not get a mixed-content failure.
 */
export function buildTerminalUrl(namespace: string, sandboxName: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const path =
    `/dashboard/api/namespace/${encodeURIComponent(namespace)}` +
    `/sandboxes/${encodeURIComponent(sandboxName)}/terminal`;
  return `${protocol}//${window.location.host}${path}`;
}

/**
 * Opens a terminal session. The returned handle is usable immediately: what is
 * sent before the shell attaches is held by the relay rather than dropped, so
 * the caller does not have to wait for `onReady` to report its size.
 */
export function openTerminal(
  namespace: string,
  sandboxName: string,
  handlers: TerminalHandlers,
): TerminalConnection {
  const ws = new WebSocket(buildTerminalUrl(namespace, sandboxName));

  // A reported failure beats the close code, which is 1006 for everything.
  let reason: string | undefined;

  ws.onmessage = (event: MessageEvent<string>) => {
    const message = String(event.data);
    const payload = message.slice(1);
    switch (message.charAt(0)) {
      case SERVER_FRAME.OUTPUT:
        handlers.onData(payload);
        break;
      case SERVER_FRAME.ERROR:
        reason = payload;
        break;
      case SERVER_FRAME.READY:
        handlers.onReady();
        break;
    }
  };

  ws.onclose = () => handlers.onClose(reason);

  // The terminal measures itself as soon as it is on screen, which is well
  // before the socket opens, and `send` on a connecting socket throws. The
  // relay holds what arrives before the shell attaches, so anything queued
  // here still reaches it in order.
  const queue: string[] = [];

  ws.onopen = () => {
    for (const message of queue) {
      ws.send(message);
    }
    queue.length = 0;
  };

  const post = (message: string): void => {
    if (ws.readyState === WebSocket.CONNECTING) {
      queue.push(message);
      return;
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  };

  return {
    send(data: string): void {
      post(CLIENT_FRAME.INPUT + data);
    },

    resize(cols: number, rows: number): void {
      post(CLIENT_FRAME.RESIZE + JSON.stringify({ cols, rows }));
    },

    close(): void {
      // Nothing is expected after this, and a close while still connecting
      // throws rather than being ignored.
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    },
  };
}
