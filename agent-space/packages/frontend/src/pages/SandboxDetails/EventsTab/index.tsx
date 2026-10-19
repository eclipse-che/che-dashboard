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

import { PageSection } from '@patternfly/react-core';
import React from 'react';

import { ErrorAlert } from '@/components/ErrorAlert';
import { EventsTimeline } from '@/components/EventsTimeline';
import { SandboxError, SandboxEvent } from '@/services/types';

export type Props = {
  events: SandboxEvent[];
  /** Set when the last listing failed; the tab says so instead of looking empty. */
  error?: SandboxError;
};

/** The namespace events that mention this sandbox. */
export function EventsTab({ events, error }: Props): React.ReactElement {
  return (
    <PageSection data-testid="events-tab">
      <ErrorAlert title="Could not list the events" error={error} />
      <EventsTimeline events={events} hasFailed={error !== undefined} />
    </PageSection>
  );
}
