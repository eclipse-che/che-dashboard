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
  Card,
  CardBody,
  CardHeader,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import React from 'react';

import styles from '@/components/EventsTimeline/Item/index.module.css';
import { formatEventTime } from '@/services/format';
import { SandboxEvent } from '@/services/types';

export type Props = {
  event: SandboxEvent;
};

/** One card on the timeline, laid out like the dashboard's workspace events. */
export function EventsTimelineItem({ event }: Props): React.ReactElement {
  const isWarning = event.type === 'Warning';
  const count = event.count ?? 1;
  const time = formatEventTime(event.lastTimestamp ?? event.firstTimestamp);

  return (
    <div className={styles.eventRow} data-testid="event-row">
      <div className={styles.iconBox}>
        <i
          className={`${styles.eventIcon}${isWarning ? ` ${styles.warning}` : ''}`}
          title={event.reason ?? undefined}
        />
        <div className={styles.iconLine} />
      </div>
      <div className={styles.eventBox}>
        <Content>
          <Card isCompact>
            <CardHeader className={styles.header}>
              <Flex>
                <FlexItem>
                  <Content component={ContentVariants.small}>
                    <span data-testid="event-reason">{event.reason ?? 'Event'}</span>
                    {event.reportingComponent && (
                      <div>Generated from {event.reportingComponent}</div>
                    )}
                  </Content>
                </FlexItem>
                <FlexItem align={{ default: 'alignRight' }}>
                  <Content component={ContentVariants.small}>
                    {count > 1 && <span data-testid="event-count">{count} times, last at </span>}
                    <span data-testid="event-time">{time}</span>
                  </Content>
                </FlexItem>
              </Flex>
            </CardHeader>
            <CardBody>
              <Content component="p">{event.message}</Content>
            </CardBody>
          </Card>
        </Content>
      </div>
    </div>
  );
}
