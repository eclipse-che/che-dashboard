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
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import React from 'react';

import { buildAgentSpaceUrl } from '@/services/helpers/agentSpace';

/**
 * Hands the browser over to the Agent Space MVP application.
 *
 * Agent Space is built and deployed as a standalone bundle (see `agent-space/`),
 * so it is reached with a full page load rather than a client-side route change.
 * The empty state below stays visible if the bundle is not deployed on this cluster.
 */
export default function AgentSpaceContainer(): React.ReactElement {
  const agentSpaceUrl = React.useMemo(() => buildAgentSpaceUrl(), []);

  React.useEffect(() => {
    window.location.replace(agentSpaceUrl);
  }, [agentSpaceUrl]);

  return (
    <PageSection>
      <Bullseye>
        <EmptyState icon={Spinner} titleText="Opening Agent Space">
          <EmptyStateBody>
            If the page does not open automatically, Agent Space may not be deployed on this
            cluster.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button component="a" href={agentSpaceUrl} variant="primary">
                Go to Agent Space
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    </PageSection>
  );
}
