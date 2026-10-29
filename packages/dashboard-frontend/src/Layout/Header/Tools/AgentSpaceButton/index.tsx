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

import { Button, ButtonVariant } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import React from 'react';

import { buildAgentSpaceUrl } from '@/services/helpers/agentSpace';

/**
 * Opens the Agent Space MVP application from the masthead.
 *
 * Agent Space is a standalone bundle served next to the dashboard assets, so it is
 * reached with a full page load rather than a client-side route change. The button
 * mirrors the 'Workspaces' button Agent Space uses to come back here.
 */
export class AgentSpaceButton extends React.PureComponent {
  public render(): React.ReactElement {
    const agentSpaceUrl = buildAgentSpaceUrl();

    return (
      <Button
        component="a"
        href={agentSpaceUrl}
        variant={ButtonVariant.secondary}
        size="sm"
        icon={<ExternalLinkAltIcon />}
        iconPosition="end"
        data-testid="agent-space-button"
      >
        Agent Space
      </Button>
    );
  }
}
