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

import { buildTerminalUrl, openTerminal, TerminalHandlers } from '@/services/terminal';

/** Enough of a WebSocket to drive the client without a server. */
class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static last: FakeWebSocket | undefined;

  readyState = FakeWebSocket.CONNECTING;
  readonly sent: string[] = [];
  closeCalls = 0;

  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: (() => void) | null = null;
  onopen: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.last = this;
  }

  send(data: string): void {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new Error('send on a socket that is not open');
    }
    this.sent.push(data);
  }

  close(): void {
    this.closeCalls += 1;
    this.readyState = FakeWebSocket.CLOSED;
  }

  /** Completes the handshake the way the browser would. */
  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(data: string): void {
    this.onmessage?.({ data } as MessageEvent<string>);
  }
}

function handlers(): TerminalHandlers & {
  data: string[];
  ready: number;
  closed: (string | undefined)[];
} {
  const record = {
    data: [] as string[],
    ready: 0,
    closed: [] as (string | undefined)[],
    onData(chunk: string) {
      record.data.push(chunk);
    },
    onReady() {
      record.ready += 1;
    },
    onClose(reason: string | undefined) {
      record.closed.push(reason);
    },
  };
  return record;
}

const originalWebSocket = global.WebSocket;

beforeEach(() => {
  FakeWebSocket.last = undefined;
  global.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
});

describe('buildTerminalUrl', () => {
  it('follows the page onto the dashboard origin', () => {
    expect(buildTerminalUrl('user-che', 'hello-world')).toEqual(
      'ws://localhost/dashboard/api/namespace/user-che/sandboxes/hello-world/terminal',
    );
  });

  it('escapes a name that would otherwise change the path', () => {
    expect(buildTerminalUrl('ns/../other', 'a b')).toContain('namespace/ns%2F..%2Fother');
    expect(buildTerminalUrl('ns', 'a b')).toContain('sandboxes/a%20b/terminal');
  });
});

describe('openTerminal', () => {
  it('holds what is sent before the socket opens, in order', () => {
    const record = handlers();
    const connection = openTerminal('user-che', 'hello-world', record);
    const socket = FakeWebSocket.last!;

    // The terminal measures itself as soon as it is mounted, which is well
    // before the handshake finishes; sending then would throw.
    connection.resize(80, 24);
    connection.send('ls');
    expect(socket.sent).toEqual([]);

    socket.open();

    expect(socket.sent).toEqual(['1{"cols":80,"rows":24}', '0ls']);
  });

  it('frames keystrokes and resizes apart once open', () => {
    const connection = openTerminal('user-che', 'hello-world', handlers());
    const socket = FakeWebSocket.last!;
    socket.open();

    connection.send('echo hi\r');
    connection.resize(120, 40);

    expect(socket.sent).toEqual(['0echo hi\r', '1{"cols":120,"rows":40}']);
  });

  it('reports output and the shell attaching', () => {
    const record = handlers();
    openTerminal('user-che', 'hello-world', record);
    const socket = FakeWebSocket.last!;

    socket.receive('2');
    socket.receive('0total 0\r\n');

    expect(record.ready).toEqual(1);
    expect(record.data).toEqual(['total 0\r\n']);
  });

  it('closes with the reason the relay gave rather than the close code', () => {
    const record = handlers();
    openTerminal('user-che', 'hello-world', record);
    const socket = FakeWebSocket.last!;

    socket.receive('1The pod of sandbox is Pending');
    socket.onclose?.();

    expect(record.closed).toEqual(['The pod of sandbox is Pending']);
  });

  it('closes with no reason when the socket simply dropped', () => {
    const record = handlers();
    openTerminal('user-che', 'hello-world', record);

    FakeWebSocket.last!.onclose?.();

    expect(record.closed).toEqual([undefined]);
  });

  it('ignores a frame it does not know', () => {
    const record = handlers();
    openTerminal('user-che', 'hello-world', record);

    FakeWebSocket.last!.receive('9something new');

    expect(record.data).toEqual([]);
    expect(record.ready).toEqual(0);
  });

  it('closes a socket that never finished connecting, and stays quiet', () => {
    const record = handlers();
    const connection = openTerminal('user-che', 'hello-world', record);
    const socket = FakeWebSocket.last!;

    connection.close();

    expect(socket.closeCalls).toEqual(1);
    // The caller asked for this one, so it is not reported back as a session
    // that ended on its own.
    expect(record.closed).toEqual([]);
  });

  it('drops what is sent after it closed instead of throwing', () => {
    const connection = openTerminal('user-che', 'hello-world', handlers());
    const socket = FakeWebSocket.last!;
    socket.open();
    connection.close();

    expect(() => connection.send('ls')).not.toThrow();
    expect(socket.sent).toEqual([]);
  });
});
