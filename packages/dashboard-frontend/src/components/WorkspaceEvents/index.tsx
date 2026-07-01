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

import { CoreV1Event } from '@kubernetes/client-node';
import {
  Button,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  PageSection,
  PageSectionVariants,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { FileIcon, PauseIcon, PlayIcon } from '@patternfly/react-icons';
import React from 'react';
import Pluralize from 'react-pluralize';
import { connect, ConnectedProps } from 'react-redux';

import compareEventTime from '@/components/WorkspaceEvents/compareEventTime';
import styles from '@/components/WorkspaceEvents/index.module.css';
import { WorkspaceEventsItem } from '@/components/WorkspaceEvents/Item';
import { enqueueAnnouncement } from '@/components/WorkspaceProgress/StepTitle/announceQueue';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectAllEvents, selectEventsFromResourceVersion } from '@/store/Events/selectors';
import { selectStartedWorkspaces } from '@/store/Workspaces/devWorkspaces/selectors';
import { selectAllWorkspaces } from '@/store/Workspaces/selectors';

export type Props = {
  workspaceUID: string | undefined;
  /** When true (default), hides events and shows an empty state while the
   * workspace is STOPPED. Set to false on the loader page so startup events
   * remain visible after the user presses Stop. */
  hideWhenStopped?: boolean;
  /** When false, new events are tracked but not announced (tab is not visible). */
  isActive?: boolean;
} & MappedProps;

type State = {
  isPaused: boolean;
  frozenEvents: CoreV1Event[];
};

class WorkspaceEvents extends React.PureComponent<Props, State> {
  // Tracks UIDs of events already announced so we never repeat them.
  private readonly announcedUIDs = new Set<string>();

  readonly state: State = {
    isPaused: false,
    frozenEvents: [],
  };

  public componentDidMount(): void {
    // Pre-seed announced UIDs with all events that already exist at mount time
    // so only events that arrive *after* mount are treated as new and announced.
    this.seedAnnouncedUIDs();
  }

  private seedAnnouncedUIDs(): void {
    const { workspaceUID, allWorkspaces, startedWorkspaces, eventsFromResourceVersionFn } =
      this.props;
    const workspace = this.findWorkspace(workspaceUID, allWorkspaces);
    if (!workspace || workspace.status === DevWorkspaceStatus.STOPPED) {
      return;
    }
    const startResourceVersion = startedWorkspaces[workspaceUID!] || '0';
    const events = eventsFromResourceVersionFn(startResourceVersion);
    for (const event of events) {
      if (!event.message) {
        continue;
      }
      const uid = event.metadata?.uid ?? `${event.message}${event.lastTimestamp ?? ''}`;
      this.announcedUIDs.add(uid);
    }
  }

  public componentDidUpdate(): void {
    const {
      workspaceUID,
      allWorkspaces,
      startedWorkspaces,
      eventsFromResourceVersionFn,
      isActive = true,
    } = this.props;

    const workspace = this.findWorkspace(workspaceUID, allWorkspaces);
    if (!workspace || workspace.status === DevWorkspaceStatus.STOPPED) {
      return;
    }

    const startResourceVersion = startedWorkspaces[workspaceUID!] || '0';
    const events = eventsFromResourceVersionFn(startResourceVersion);

    for (const event of events) {
      if (!event.message) {
        continue;
      }
      const uid = event.metadata?.uid ?? `${event.message}${event.lastTimestamp ?? ''}`;
      if (!this.announcedUIDs.has(uid)) {
        this.announcedUIDs.add(uid);
        if (isActive) {
          enqueueAnnouncement(`Event: ${event.message}`);
        }
      }
    }
  }

  private findWorkspace(
    workspaceUID: string | undefined,
    allWorkspaces: Workspace[],
  ): Workspace | undefined {
    if (workspaceUID === undefined) {
      return undefined;
    }
    return allWorkspaces.find(workspace => workspace.uid === workspaceUID);
  }

  private handleTogglePause(liveEvents: CoreV1Event[]): void {
    const { isPaused } = this.state;
    if (!isPaused) {
      this.setState({ isPaused: true, frozenEvents: liveEvents });
    } else {
      this.setState({ isPaused: false, frozenEvents: [] });
    }
  }

  private getEventItems(events: CoreV1Event[]): React.ReactNodeArray {
    return events
      .filter(event => event.message)
      .sort(compareEventTime)
      .map((event, index) => {
        return (
          <StackItem key={`${event.message}${event.metadata.uid}` || index}>
            <div className={styles.fadeIn}>
              <WorkspaceEventsItem event={event}></WorkspaceEventsItem>
            </div>
          </StackItem>
        );
      });
  }

  render() {
    const { workspaceUID, allWorkspaces, startedWorkspaces, hideWhenStopped = true } = this.props;
    const { isPaused, frozenEvents } = this.state;

    const workspace = this.findWorkspace(workspaceUID, allWorkspaces);

    if (
      workspaceUID === undefined ||
      workspace === undefined ||
      (hideWhenStopped && workspace.status === DevWorkspaceStatus.STOPPED)
    ) {
      return (
        <EmptyState icon={FileIcon} titleText="No events to show.">
          <EmptyStateBody>Events will be streamed for a starting workspace.</EmptyStateBody>
        </EmptyState>
      );
    }

    const startResourceVersion = startedWorkspaces[workspaceUID] || '0';
    const liveEvents = this.props.eventsFromResourceVersionFn(startResourceVersion);
    const visibleEvents = isPaused ? frozenEvents : liveEvents;

    const pendingCount = isPaused
      ? Math.max(
          0,
          liveEvents.filter(e => e.message).length - frozenEvents.filter(e => e.message).length,
        )
      : 0;

    const eventItems = this.getEventItems(visibleEvents);

    const tailStackItem = (
      <StackItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Button
              variant="plain"
              className={`${styles.pauseButton}${isPaused ? '' : ` ${styles.active}`}`}
              aria-label={isPaused ? 'Resume event streaming' : 'Pause event streaming'}
              aria-pressed={isPaused}
              onClick={() => this.handleTogglePause(liveEvents)}
            >
              <span className="pf-v6-c-button__icon">
                {isPaused ? <PlayIcon /> : <PauseIcon />}
              </span>
            </Button>
          </FlexItem>
          <FlexItem>
            <Content component={ContentVariants.small}>
              {isPaused
                ? `Event stream is paused.${pendingCount > 0 ? ` ${pendingCount} new event${pendingCount === 1 ? '' : 's'} waiting.` : ''}`
                : 'Streaming events...'}
            </Content>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            <Content component={ContentVariants.small}>
              Showing <Pluralize singular={'event'} count={eventItems.length} />
            </Content>
          </FlexItem>
        </Flex>
      </StackItem>
    );
    const headStackItem = (
      <StackItem>
        <Content component={ContentVariants.small}>Older events are not stored.</Content>
      </StackItem>
    );

    return (
      <PageSection variant={PageSectionVariants.default}>
        <div role="log" aria-label="Workspace events" aria-live={isPaused ? 'off' : 'polite'}>
          <Stack hasGutter style={{ gap: 'unset' }}>
            {tailStackItem}
            {eventItems.length > 0 && (
              <StackItem>
                <div className={styles.eventsTimeline}>
                  <Stack hasGutter>{eventItems}</Stack>
                </div>
              </StackItem>
            )}
            {headStackItem}
          </Stack>
        </div>
      </PageSection>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  allEvents: selectAllEvents(state),
  allWorkspaces: selectAllWorkspaces(state),
  eventsFromResourceVersionFn: selectEventsFromResourceVersion(state),
  startedWorkspaces: selectStartedWorkspaces(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspaceEvents);
