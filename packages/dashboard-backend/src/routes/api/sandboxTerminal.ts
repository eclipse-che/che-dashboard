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

import { helpers } from '@eclipse-che/common';
import { FastifyInstance, FastifyRequest } from 'fastify';
import WebSocket from 'ws';

import { baseApiPath } from '@/constants/config';
import { ISandboxTerminalSession } from '@/devworkspaceClient/types';
import { restParams } from '@/models';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getToken } from '@/routes/api/helpers/getToken';
import { logger } from '@/utils/logger';

/**
 * Relays a shell in a sandbox pod to the browser on the dashboard's own
 * origin, the way the agent terminal of PR #1515 relays ttyd.
 *
 * Nothing new is exposed for this: there is no second Route, no sidecar and no
 * extra hostname, and a cluster that serves no Routes at all still gets a
 * terminal. The upstream is the API server's `pods/exec` subresource rather
 * than a server running in the pod, so it also works for a sandbox that has no
 * editor injected - which today has no way in at all.
 *
 * The socket is opened with the user's own token, so the API server decides
 * whether this user may exec into this pod.
 */

/** Frames the browser sends. The first character says which. */
export const CLIENT_FRAME = {
  /** `0<data>` - keystrokes for the shell. */
  INPUT: '0',
  /** `1{"cols":N,"rows":N}` - the terminal was resized. */
  RESIZE: '1',
} as const;

/** Frames the browser receives. */
export const SERVER_FRAME = {
  /** `0<data>` - everything the shell wrote. */
  OUTPUT: '0',
  /** `1<text>` - why the terminal could not start, or why it ended. */
  ERROR: '1',
  /** `2` - the shell is attached and keystrokes will reach it. */
  READY: '2',
} as const;

interface TerminalSize {
  cols: number;
  rows: number;
}

/**
 * A resize is read off the wire, so its shape is checked rather than trusted.
 * A terminal with no area is refused: the API server accepts it and the shell
 * then renders into nothing.
 */
export function parseResize(payload: string): TerminalSize | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const { cols, rows } = parsed as Record<string, unknown>;
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
    return undefined;
  }
  const size = { cols: cols as number, rows: rows as number };
  return size.cols > 0 && size.rows > 0 ? size : undefined;
}

export function registerSandboxTerminalRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.get(
      `${baseApiPath}/namespace/:namespace/sandboxes/:sandboxName/terminal`,
      { websocket: true },
      sandboxTerminalHandler,
    );
  });
}

export async function sandboxTerminalHandler(
  ws: WebSocket,
  request: FastifyRequest,
): Promise<void> {
  const { namespace, sandboxName } = request.params as restParams.INamespacedSandboxParams;

  const send = (frame: string, payload = ''): void => {
    if (ws.readyState === ws.OPEN) {
      ws.send(frame + payload);
    }
  };

  let session: ISandboxTerminalSession | undefined;
  let closed = false;

  // Keystrokes and the first resize can arrive before the shell is attached -
  // the browser sizes its terminal as soon as it is on screen, which is well
  // before the exec handshake finishes. Dropping them loses the initial size
  // and the first thing the user typed, so they wait here instead.
  const pending: string[] = [];

  ws.on('message', (raw: WebSocket.RawData) => {
    const message = raw.toString();
    const frame = message.charAt(0);
    const payload = message.slice(1);

    if (session === undefined) {
      pending.push(message);
      return;
    }
    handle(session, frame, payload);
  });

  ws.on('close', () => {
    closed = true;
    session?.close();
  });

  function handle(current: ISandboxTerminalSession, frame: string, payload: string): void {
    if (frame === CLIENT_FRAME.INPUT) {
      current.write(payload);
      return;
    }
    if (frame === CLIENT_FRAME.RESIZE) {
      const size = parseResize(payload);
      if (size !== undefined) {
        current.resize(size.cols, size.rows);
      }
    }
  }

  try {
    const token = getToken(request);
    const { sandboxTerminalApi } = getDevWorkspaceClient(token);

    const target = await sandboxTerminalApi.resolveTarget(namespace, sandboxName);
    const started = await sandboxTerminalApi.openSession(namespace, target, {
      onData: chunk => send(SERVER_FRAME.OUTPUT, chunk),
      onClose: reason => {
        if (reason !== undefined) {
          send(SERVER_FRAME.ERROR, reason);
        }
        ws.close();
      },
    });

    // The browser may have given up while the handshake was in flight.
    if (closed) {
      started.close();
      return;
    }

    session = started;
    send(SERVER_FRAME.READY);
    for (const message of pending) {
      handle(started, message.charAt(0), message.slice(1));
    }
    pending.length = 0;
  } catch (e) {
    logger.error(e, `Failed to open a terminal in sandbox '${sandboxName}'`);
    send(SERVER_FRAME.ERROR, helpers.errors.getMessage(e));
    ws.close();
  }
}
