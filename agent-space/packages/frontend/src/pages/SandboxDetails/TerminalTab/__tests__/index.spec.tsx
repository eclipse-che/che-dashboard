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

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { TerminalTab } from '@/pages/SandboxDetails/TerminalTab';
import { TerminalHandlers } from '@/services/terminal';
import { THEME_STORAGE_KEY, ThemePreference } from '@/services/theme';

/**
 * xterm measures real glyphs against a real canvas, neither of which JSDOM
 * has. The tab's own job - wiring the emulator to the relay and back - is what
 * these tests are about, so the emulator is a stand-in that records.
 */
interface FakeTerminal {
  options: { theme?: { background?: string } };
  written: string[];
  cols: number;
  rows: number;
  host: HTMLElement | undefined;
  disposed: boolean;
  inputDisposed: boolean;
  emitInput(data: string): void;
}

const mockTerminals: FakeTerminal[] = [];

jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn().mockImplementation((options: { theme?: { background?: string } }) => {
    let onInput: ((data: string) => void) | undefined;
    const terminal: FakeTerminal & {
      loadAddon(addon: unknown): void;
      open(host: HTMLElement): void;
      write(chunk: string): void;
      onData(listener: (data: string) => void): { dispose(): void };
      dispose(): void;
    } = {
      options,
      written: [],
      cols: 80,
      rows: 24,
      host: undefined,
      disposed: false,
      inputDisposed: false,
      loadAddon: () => undefined,
      open: host => {
        terminal.host = host;
      },
      write: chunk => {
        terminal.written.push(chunk);
      },
      onData: listener => {
        onInput = listener;
        return {
          dispose: () => {
            terminal.inputDisposed = true;
          },
        };
      },
      dispose: () => {
        terminal.disposed = true;
      },
      emitInput: data => onInput?.(data),
    };
    mockTerminals.push(terminal);
    return terminal;
  }),
}));

/** Counts the fits, and can be told to fail the way a hidden tab makes it fail. */
const mockFit = { calls: 0, shouldThrow: false };

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({
    fit: () => {
      mockFit.calls += 1;
      if (mockFit.shouldThrow) {
        throw new Error('cannot measure a hidden element');
      }
    },
  })),
}));

interface FakeConnection {
  namespace: string;
  sandboxName: string;
  handlers: TerminalHandlers;
  sent: string[];
  resizes: Array<{ cols: number; rows: number }>;
  closed: boolean;
}

const mockConnections: FakeConnection[] = [];

jest.mock('@/services/terminal', () => ({
  openTerminal: jest.fn((namespace: string, sandboxName: string, handlers: TerminalHandlers) => {
    const connection: FakeConnection = {
      namespace,
      sandboxName,
      handlers,
      sent: [],
      resizes: [],
      closed: false,
    };
    mockConnections.push(connection);
    return {
      send: (data: string) => connection.sent.push(data),
      resize: (cols: number, rows: number) => connection.resizes.push({ cols, rows }),
      close: () => {
        connection.closed = true;
      },
    };
  }),
}));

function renderTab() {
  return render(<TerminalTab namespace="user-che" sandboxName="hello-world" />);
}

function lastTerminal(): FakeTerminal {
  return mockTerminals[mockTerminals.length - 1];
}

function lastConnection(): FakeConnection {
  return mockConnections[mockConnections.length - 1];
}

beforeEach(() => {
  mockTerminals.length = 0;
  mockConnections.length = 0;
  mockFit.calls = 0;
  mockFit.shouldThrow = false;
  window.localStorage.clear();
});

describe('TerminalTab', () => {
  it('opens one shell in the sandbox it was given', () => {
    renderTab();

    expect(screen.getByTestId('terminal-tab')).toBeVisible();
    expect(mockConnections).toHaveLength(1);
    expect(lastConnection().namespace).toEqual('user-che');
    expect(lastConnection().sandboxName).toEqual('hello-world');
  });

  it('attaches the emulator to the element on the page', () => {
    renderTab();

    expect(lastTerminal().host).toBe(screen.getByTestId('terminal-host'));
  });

  it('prints what the sandbox sends', () => {
    renderTab();

    lastConnection().handlers.onData('total 0\r\n');

    expect(lastTerminal().written).toEqual(['total 0\r\n']);
  });

  it('forwards what is typed', () => {
    renderTab();

    lastTerminal().emitInput('ls\r');

    expect(lastConnection().sent).toEqual(['ls\r']);
  });

  it('tells the shell its size once it is attached', () => {
    renderTab();
    const sizesBefore = lastConnection().resizes.length;

    lastConnection().handlers.onReady();

    expect(lastConnection().resizes.length).toBeGreaterThan(sizesBefore);
    expect(lastConnection().resizes.pop()).toEqual({ cols: 80, rows: 24 });
  });

  it('skips the resize when the box cannot be measured', () => {
    mockFit.shouldThrow = true;

    renderTab();
    lastConnection().handlers.onReady();

    expect(mockFit.calls).toBeGreaterThan(0);
    expect(lastConnection().resizes).toEqual([]);
  });

  it('follows the dashboard into the dark theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, ThemePreference.DARK);

    renderTab();

    expect(lastTerminal().options.theme?.background).toEqual('#0f1214');
  });

  it('says nothing about the session while it is up', () => {
    renderTab();

    expect(screen.queryByTestId('terminal-closed')).not.toBeInTheDocument();
  });

  it('reports why the session ended', async () => {
    renderTab();

    await act(() => lastConnection().handlers.onClose('command terminated with exit code 137'));

    expect(screen.getByTestId('terminal-closed')).toHaveTextContent(
      'command terminated with exit code 137',
    );
  });

  it('explains an ending with no reason given', async () => {
    renderTab();

    await act(() => lastConnection().handlers.onClose(undefined));

    expect(screen.getByTestId('terminal-closed')).toHaveTextContent(
      'The shell exited or the connection was lost',
    );
  });

  it('starts a fresh session on Reconnect, and drops the old one', async () => {
    renderTab();
    await act(() => lastConnection().handlers.onClose('the pod went away'));

    await userEvent.click(screen.getByTestId('terminal-reconnect'));

    expect(mockConnections).toHaveLength(2);
    expect(mockConnections[0].closed).toBe(true);
    expect(mockTerminals[0].disposed).toBe(true);
    expect(screen.queryByTestId('terminal-closed')).not.toBeInTheDocument();
  });

  it('ends the session when the tab goes away', () => {
    const { unmount } = renderTab();

    unmount();

    expect(lastConnection().closed).toBe(true);
    expect(lastTerminal().disposed).toBe(true);
    expect(lastTerminal().inputDisposed).toBe(true);
  });
});
