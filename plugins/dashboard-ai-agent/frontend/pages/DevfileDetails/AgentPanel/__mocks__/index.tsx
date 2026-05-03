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

import React from 'react';

import { Props } from '@/pages/DevfileDetails/AgentPanel';

const AgentPanel = (props: Props) => (
  <div data-testid="agent-panel">
    <span data-testid="agent-is-terminal-expanded">{String(props.isTerminalExpanded)}</span>
    <button onClick={props.onStopAgent}>Stop</button>
    <button onClick={() => props.onStartAgent()}>Start Agent</button>
    <button onClick={props.onTerminalExpandToggle}>Toggle Terminal</button>
  </div>
);
export default AgentPanel;
