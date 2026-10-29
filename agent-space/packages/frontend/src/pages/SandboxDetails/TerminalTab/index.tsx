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

import '@xterm/xterm/css/xterm.css';

import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  PageSection,
} from '@patternfly/react-core';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import React from 'react';

import { useDashboardTheme } from '@/hooks/useDashboardTheme';
import styles from '@/pages/SandboxDetails/TerminalTab/index.module.css';
import { openTerminal, TerminalConnection } from '@/services/terminal';

export type Props = {
  namespace: string;
  sandboxName: string;
};

/** Colours that keep the terminal legible against either dashboard theme. */
const DARK_THEME = { background: '#0f1214', foreground: '#e0e0e0', cursor: '#e0e0e0' };
const LIGHT_THEME = { background: '#1b1d21', foreground: '#e0e0e0', cursor: '#e0e0e0' };

/**
 * A shell in the sandbox pod, relayed by the dashboard backend.
 *
 * The session lives as long as the tab is mounted: leaving the tab closes it,
 * which also ends the `pods/exec` call rather than leaving a shell behind.
 * Nothing is replayed on return, the same way a terminal emulator behaves.
 */
export function TerminalTab({ namespace, sandboxName }: Props): React.ReactElement {
  const { isDarkTheme } = useDashboardTheme();
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [closedReason, setClosedReason] = React.useState<string | undefined>(undefined);
  const [hasClosed, setHasClosed] = React.useState(false);

  // Bumping this remounts the session without remounting the tab, which is
  // what "Reconnect" does.
  const [attempt, setAttempt] = React.useState(0);

  // The box has to be back on the page before the effect looks for it, so the
  // ending is cleared here rather than left to the effect that opens the shell.
  const handleReconnect = React.useCallback(() => {
    setHasClosed(false);
    setClosedReason(undefined);
    setAttempt(current => current + 1);
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }

    setHasClosed(false);
    setClosedReason(undefined);

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontSize: 13,
      fontFamily: 'var(--pf-t--global--font--family--mono), monospace',
      theme: isDarkTheme ? DARK_THEME : LIGHT_THEME,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);

    const connection: TerminalConnection = openTerminal(namespace, sandboxName, {
      onData: chunk => terminal.write(chunk),
      onReady: () => fit(),
      onClose: reason => {
        setClosedReason(reason);
        setHasClosed(true);
      },
    });

    // Declared after the connection it reports to; hoisting keeps it reachable
    // from the handlers above, which cannot run before the session exists.
    function fit(): void {
      try {
        fitAddon.fit();
      } catch {
        // The tab can be measured while it is hidden, where there is no area
        // to fit into. The next resize settles it.
        return;
      }
      connection.resize(terminal.cols, terminal.rows);
    }

    fit();
    const onInput = terminal.onData(data => connection.send(data));

    const observer = new ResizeObserver(() => fit());
    observer.observe(host);

    return () => {
      observer.disconnect();
      onInput.dispose();
      connection.close();
      terminal.dispose();
    };
  }, [attempt, isDarkTheme, namespace, sandboxName]);

  return (
    <PageSection data-testid="terminal-tab">
      {/* A dead shell is a black box with a frozen cursor in it, so the box
          goes away with the session and the ending takes its place. */}
      {!hasClosed && <div className={styles.terminal} ref={hostRef} data-testid="terminal-host" />}
      {hasClosed && (
        <EmptyState
          titleText="The terminal session ended"
          variant="sm"
          data-testid="terminal-closed"
        >
          <EmptyStateBody>
            {closedReason ?? 'The shell exited or the connection was lost.'}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant={ButtonVariant.secondary}
                onClick={handleReconnect}
                data-testid="terminal-reconnect"
              >
                Reconnect
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      )}
    </PageSection>
  );
}
