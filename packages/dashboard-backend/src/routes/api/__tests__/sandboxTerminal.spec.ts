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

import EventEmitter from 'events';

import { SandboxTerminalHandlers, SandboxTerminalTarget } from '@/devworkspaceClient/types';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { parseResize, sandboxTerminalHandler } from '@/routes/api/sandboxTerminal';

jest.mock('../helpers/getToken.ts', () => ({
  getToken: jest.fn().mockReturnValue('test-token'),
}));
jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('@/utils/logger');

const namespace = 'user-che';
const sandboxName = 'hello-world';

type MockWebSocket = EventEmitter & {
  send: jest.Mock;
  close: jest.Mock;
  readyState: number;
  OPEN: number;
};

function mockWebSocket(): MockWebSocket {
  return Object.assign(new EventEmitter(), {
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1,
    OPEN: 1,
  });
}

/** What the handler sent, without the frame character. */
function framesOf(ws: MockWebSocket, frame: string): string[] {
  return ws.send.mock.calls
    .map(([message]: [string]) => message)
    .filter((message: string) => message.startsWith(frame))
    .map((message: string) => message.slice(1));
}

describe('parseResize', () => {
  it('reads a size the browser sent', () => {
    expect(parseResize('{"cols":120,"rows":40}')).toEqual({ cols: 120, rows: 40 });
  });

  it('refuses something that is not JSON', () => {
    expect(parseResize('120x40')).toBeUndefined();
  });

  it('refuses JSON that is not an object', () => {
    expect(parseResize('42')).toBeUndefined();
    expect(parseResize('null')).toBeUndefined();
  });

  it('refuses a size that is not whole numbers', () => {
    expect(parseResize('{"cols":"120","rows":40}')).toBeUndefined();
    expect(parseResize('{"cols":120.5,"rows":40}')).toBeUndefined();
    expect(parseResize('{"rows":40}')).toBeUndefined();
  });

  it('refuses a terminal with no area to draw in', () => {
    expect(parseResize('{"cols":0,"rows":40}')).toBeUndefined();
    expect(parseResize('{"cols":120,"rows":-1}')).toBeUndefined();
  });
});

describe('Sandbox terminal handler', () => {
  let ws: MockWebSocket;
  let session: { write: jest.Mock; resize: jest.Mock; close: jest.Mock };
  let handlers: SandboxTerminalHandlers | undefined;
  let resolveTarget: jest.Mock;
  let openSession: jest.Mock;

  const request = {
    params: { namespace, sandboxName },
    headers: { authorization: 'Bearer test-token' },
  };

  function start(): Promise<void> {
    return sandboxTerminalHandler(ws as never, request as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();

    ws = mockWebSocket();
    session = { write: jest.fn(), resize: jest.fn(), close: jest.fn() };
    handlers = undefined;

    resolveTarget = jest.fn().mockResolvedValue({ podName: sandboxName, containerName: 'agent' });
    openSession = jest
      .fn()
      .mockImplementation(
        (_namespace: string, _target: SandboxTerminalTarget, given: SandboxTerminalHandlers) => {
          handlers = given;
          return Promise.resolve(session);
        },
      );

    (getDevWorkspaceClient as jest.Mock).mockReturnValue({
      sandboxTerminalApi: { resolveTarget, openSession },
    });
  });

  it('opens the shell the request names, and says when it is attached', async () => {
    await start();

    expect(resolveTarget).toHaveBeenCalledWith(namespace, sandboxName);
    expect(openSession).toHaveBeenCalledWith(
      namespace,
      { podName: sandboxName, containerName: 'agent' },
      expect.anything(),
    );
    expect(ws.send).toHaveBeenCalledWith('2');
  });

  it('passes keystrokes to the shell', async () => {
    await start();

    ws.emit('message', Buffer.from('0ls\r'));

    expect(session.write).toHaveBeenCalledWith('ls\r');
  });

  it('passes a resize to the shell', async () => {
    await start();

    ws.emit('message', Buffer.from('1{"cols":120,"rows":40}'));

    expect(session.resize).toHaveBeenCalledWith(120, 40);
  });

  it('ignores a resize it cannot make sense of', async () => {
    await start();

    ws.emit('message', Buffer.from('1not json'));

    expect(session.resize).not.toHaveBeenCalled();
  });

  it('ignores a frame it does not know', async () => {
    await start();

    ws.emit('message', Buffer.from('9surprise'));

    expect(session.write).not.toHaveBeenCalled();
    expect(session.resize).not.toHaveBeenCalled();
  });

  it('keeps what arrived during the handshake, and replays it in order', async () => {
    const pending = start();

    // The browser sizes its terminal and starts typing as soon as the tab is
    // on screen, which is well before the exec handshake finishes.
    ws.emit('message', Buffer.from('1{"cols":100,"rows":30}'));
    ws.emit('message', Buffer.from('0whoami\r'));
    expect(session.write).not.toHaveBeenCalled();

    await pending;

    expect(session.resize).toHaveBeenCalledWith(100, 30);
    expect(session.write).toHaveBeenCalledWith('whoami\r');
    // Nothing is replayed twice.
    ws.emit('message', Buffer.from('0ls\r'));
    expect(session.write).toHaveBeenCalledTimes(2);
  });

  it('relays what the shell writes', async () => {
    await start();

    handlers?.onData('a prompt');

    expect(framesOf(ws, '0')).toEqual(['a prompt']);
  });

  it('says why the session ended, then hangs up', async () => {
    await start();

    handlers?.onClose('command terminated with exit code 137');

    expect(framesOf(ws, '1')).toEqual(['command terminated with exit code 137']);
    expect(ws.close).toHaveBeenCalled();
  });

  it('hangs up quietly when the shell simply exited', async () => {
    await start();

    handlers?.onClose(undefined);

    expect(framesOf(ws, '1')).toEqual([]);
    expect(ws.close).toHaveBeenCalled();
  });

  it('ends the shell when the browser goes away', async () => {
    await start();

    ws.emit('close');

    expect(session.close).toHaveBeenCalled();
  });

  it('does not leave a shell behind when the browser left mid-handshake', async () => {
    const pending = start();

    ws.emit('close');
    await pending;

    expect(session.close).toHaveBeenCalled();
    // Nothing was ever attached, so nothing is announced as attached.
    expect(ws.send).not.toHaveBeenCalledWith('2');
  });

  it('reports a sandbox it cannot open a terminal in', async () => {
    resolveTarget.mockRejectedValue(new Error(`The pod of sandbox '${sandboxName}' is Pending`));

    await start();

    expect(framesOf(ws, '1')).toEqual([`The pod of sandbox '${sandboxName}' is Pending`]);
    expect(ws.close).toHaveBeenCalled();
  });

  it('stays quiet on a socket that is already gone', async () => {
    resolveTarget.mockRejectedValue(new Error('nope'));
    ws.readyState = 3;

    await start();

    expect(ws.send).not.toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalled();
  });
});
