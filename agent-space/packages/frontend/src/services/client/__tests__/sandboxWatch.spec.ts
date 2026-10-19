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

import {
  buildWebSocketUrl,
  MAX_RECONNECT_DELAY_MS,
  RECONNECT_DELAY_MS,
  watchSandboxes,
  WatchSocket,
} from '@/services/client/sandboxWatch';
import { Sandbox, SandboxWatchEvent } from '@/services/types';

const URL = 'ws://dashboard.example.com/dashboard/api/websocket';
const NAMESPACE = 'user-ns';

const SANDBOX: Sandbox = {
  metadata: { name: 'hello-world', namespace: NAMESPACE },
  spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
};

class FakeSocket implements WatchSocket {
  public readonly sent: string[] = [];
  public isClosed = false;

  public onopen: ((this: unknown, event: unknown) => void) | null = null;
  public onmessage: ((this: unknown, event: { data: unknown }) => void) | null = null;
  public onclose: ((this: unknown, event: unknown) => void) | null = null;
  public onerror: ((this: unknown, event: unknown) => void) | null = null;

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.isClosed = true;
  }

  /** What the browser does once the server accepts the connection. */
  public open(): void {
    this.onopen?.call(undefined, {});
  }

  public deliver(payload: unknown): void {
    this.onmessage?.call(undefined, { data: JSON.stringify(payload) });
  }

  public deliverRaw(data: unknown): void {
    this.onmessage?.call(undefined, { data });
  }

  public drop(): void {
    this.onclose?.call(undefined, {});
  }
}

function start(resourceVersion = '') {
  const sockets: FakeSocket[] = [];
  const events: SandboxWatchEvent[] = [];

  const stop = watchSandboxes(
    URL,
    NAMESPACE,
    resourceVersion,
    event => events.push(event),
    () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
  );

  return { sockets, events, stop };
}

function subscription(socket: FakeSocket): unknown {
  return JSON.parse(socket.sent[0]);
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('buildWebSocketUrl', () => {
  it('keeps the host of the page and swaps the scheme', () => {
    expect(
      buildWebSocketUrl('/dashboard/api/websocket', {
        protocol: 'https:',
        host: 'che.example.com',
      } as Location),
    ).toBe('wss://che.example.com/dashboard/api/websocket');
  });

  it('uses the plain scheme on a plain page', () => {
    expect(
      buildWebSocketUrl('/ws', { protocol: 'http:', host: 'localhost:8080' } as Location),
    ).toBe('ws://localhost:8080/ws');
  });
});

describe('watchSandboxes', () => {
  it('subscribes to the sandbox channel from the version it was given', () => {
    const { sockets } = start('42');
    sockets[0].open();

    expect(subscription(sockets[0])).toEqual({
      method: 'SUBSCRIBE',
      channel: 'sandbox',
      params: { namespace: NAMESPACE, resourceVersion: '42' },
    });
  });

  it.each(['ADDED', 'MODIFIED', 'DELETED'] as const)('reports a %s sandbox', phase => {
    const { sockets, events } = start();
    sockets[0].open();

    sockets[0].deliver({ channel: 'sandbox', message: { eventPhase: phase, sandbox: SANDBOX } });

    expect(events).toEqual([{ type: phase, sandbox: SANDBOX }]);
  });

  it('reports the message of a watch error', () => {
    const { sockets, events } = start();
    sockets[0].open();

    sockets[0].deliver({
      channel: 'sandbox',
      message: { eventPhase: 'ERROR', status: { message: 'too old resource version' } },
    });

    expect(events).toEqual([{ type: 'ERROR', message: 'too old resource version' }]);
  });

  it('reports an error with no message of its own', () => {
    const { sockets, events } = start();
    sockets[0].open();

    sockets[0].deliver({ channel: 'sandbox', message: { eventPhase: 'ERROR' } });

    expect(events).toEqual([{ type: 'ERROR', message: expect.stringContaining('error') }]);
  });

  it.each([
    ['another channel', { channel: 'pod', message: { eventPhase: 'ADDED', sandbox: SANDBOX } }],
    ['a payload that is not an envelope', { eventPhase: 'ADDED', sandbox: SANDBOX }],
    ['an unknown phase', { channel: 'sandbox', message: { eventPhase: 'BOOKMARK' } }],
    ['an event with no sandbox', { channel: 'sandbox', message: { eventPhase: 'ADDED' } }],
  ])('ignores %s', (_label, payload) => {
    const { sockets, events } = start();
    sockets[0].open();

    sockets[0].deliver(payload);

    expect(events).toEqual([]);
  });

  it('ignores a message that is not JSON, and one that is not text', () => {
    const { sockets, events } = start();
    sockets[0].open();

    sockets[0].deliverRaw('not json at all');
    sockets[0].deliverRaw(new ArrayBuffer(4));

    expect(events).toEqual([]);
  });

  describe('when the connection drops', () => {
    it('tells the listener, then reconnects from the current state', () => {
      const { sockets, events } = start('42');
      sockets[0].open();

      sockets[0].drop();
      expect(events).toEqual([{ type: 'ERROR', message: expect.stringContaining('lost') }]);
      expect(sockets).toHaveLength(1);

      jest.advanceTimersByTime(RECONNECT_DELAY_MS);
      sockets[1].open();

      // An old version would be rejected by the API server; starting from
      // nothing makes it replay the current state instead.
      expect(subscription(sockets[1])).toMatchObject({
        params: { namespace: NAMESPACE, resourceVersion: '' },
      });
    });

    it('retries when the socket cannot even be created', () => {
      const events: SandboxWatchEvent[] = [];
      let attempts = 0;
      const socket = new FakeSocket();

      watchSandboxes(
        URL,
        NAMESPACE,
        '',
        event => events.push(event),
        () => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error('refused');
          }
          return socket;
        },
      );

      expect(events).toEqual([{ type: 'ERROR', message: 'refused' }]);

      jest.advanceTimersByTime(RECONNECT_DELAY_MS);
      expect(attempts).toBe(2);
    });

    it('backs off instead of reopening every three seconds forever', () => {
      const sockets: FakeSocket[] = [];
      watchSandboxes(
        URL,
        NAMESPACE,
        '',
        () => undefined,
        () => {
          const socket = new FakeSocket();
          sockets.push(socket);
          return socket;
        },
      );

      // Nothing ever opens, so every attempt waits twice as long as the last.
      sockets[0].drop();
      jest.advanceTimersByTime(RECONNECT_DELAY_MS);
      expect(sockets).toHaveLength(2);

      sockets[1].drop();
      jest.advanceTimersByTime(RECONNECT_DELAY_MS);
      expect(sockets).toHaveLength(2);
      jest.advanceTimersByTime(RECONNECT_DELAY_MS);
      expect(sockets).toHaveLength(3);

      sockets[2].drop();
      jest.advanceTimersByTime(MAX_RECONNECT_DELAY_MS);
      expect(sockets).toHaveLength(4);
    });

    it('reports the break once, not once per retry', () => {
      const events: SandboxWatchEvent[] = [];
      const sockets: FakeSocket[] = [];
      watchSandboxes(
        URL,
        NAMESPACE,
        '',
        event => events.push(event),
        () => {
          const socket = new FakeSocket();
          sockets.push(socket);
          return socket;
        },
      );

      // The listener answers an ERROR with a full list; repeating it for every
      // retry of a backend that is down buys nothing.
      sockets[0].drop();
      jest.advanceTimersByTime(MAX_RECONNECT_DELAY_MS);
      sockets[1].drop();
      jest.advanceTimersByTime(MAX_RECONNECT_DELAY_MS);

      expect(events).toHaveLength(1);
    });

    it('reports again once a reconnected socket drops', () => {
      const { sockets, events } = start();
      sockets[0].open();
      sockets[0].drop();
      jest.advanceTimersByTime(RECONNECT_DELAY_MS);

      // The socket came back, so the next break is news again - and the
      // backoff starts over from the short delay.
      sockets[1].open();
      sockets[1].drop();

      expect(events).toHaveLength(2);
      jest.advanceTimersByTime(RECONNECT_DELAY_MS);
      expect(sockets).toHaveLength(3);
    });

    it('does not reconnect after the caller stopped watching', () => {
      const { sockets, events, stop } = start();
      sockets[0].open();

      stop();
      sockets[0].drop();
      jest.advanceTimersByTime(RECONNECT_DELAY_MS * 2);

      expect(sockets).toHaveLength(1);
      expect(events).toEqual([]);
    });
  });

  it('closes the socket and drops pending messages when stopped', () => {
    const { sockets, events, stop } = start();
    sockets[0].open();

    stop();
    sockets[0].deliver({
      channel: 'sandbox',
      message: { eventPhase: 'ADDED', sandbox: SANDBOX },
    });

    expect(sockets[0].isClosed).toBe(true);
    expect(events).toEqual([]);
  });

  it('survives a socket that throws while closing', () => {
    const { sockets, stop } = start();
    sockets[0].open();
    sockets[0].close = () => {
      throw new Error('already gone');
    };

    expect(() => stop()).not.toThrow();
  });

  it('leaves the error handler to the close handler so a break is reported once', () => {
    const { sockets, events } = start();
    sockets[0].open();

    sockets[0].onerror?.call(undefined, {});

    expect(events).toEqual([]);
  });
});
