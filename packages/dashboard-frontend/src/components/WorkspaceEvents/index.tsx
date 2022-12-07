/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Flex,
  FlexItem,
  PageSection,
  PageSectionVariants,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { FileIcon } from '@patternfly/react-icons';
import React from 'react';
import Pluralize from 'react-pluralize';
import { connect, ConnectedProps } from 'react-redux';
import { DevWorkspaceStatus } from '../../services/helpers/types';
import { Workspace } from '../../services/workspace-adapter';
import { AppState } from '../../store';
import { selectAllEvents, selectEvents } from '../../store/Events/selectors';
import { selectAllWorkspaces } from '../../store/Workspaces/selectors';
import compareEventTime from './compareEventTime';
import { WorkspaceEventsItem } from './Item';

import styles from './index.module.css';

export type Props = {
  workspaceUID: string | undefined;
} & MappedProps;

export class WorkspaceEvents extends React.PureComponent<Props> {
  private findWorkspace(
    workspaceUID: string | undefined,
    allWorkspaces: Workspace[],
  ): Workspace | undefined {
    if (workspaceUID === undefined) {
      return undefined;
    }
    return allWorkspaces.find(workspace => workspace.uid === workspaceUID);
  }

  private getEventItems(events: CoreV1Event[]): React.ReactNodeArray {
    return events
      .filter(event => event.message)
      .sort(compareEventTime)
      .map(event => {
        return (
          <StackItem key={event.message}>
            <div className={styles.fadeIn}>
              <WorkspaceEventsItem event={event}></WorkspaceEventsItem>
            </div>
          </StackItem>
        );
      });
  }

  render() {
    const { workspaceUID, allWorkspaces } = this.props;

    const workspace = this.findWorkspace(workspaceUID, allWorkspaces);

    if (workspace === undefined || workspace.status === DevWorkspaceStatus.STOPPED) {
      return (
        <EmptyState>
          <EmptyStateIcon icon={FileIcon} />
          <Title headingLevel="h4" size="lg">
            No events to show.
          </Title>
          <EmptyStateBody>Events will be streamed for a starting workspace.</EmptyStateBody>
        </EmptyState>
      );
    }

    const workspaceEvents = this.props.eventsFilterFn(workspace.id);
    const eventItems = this.getEventItems(workspaceEvents);

    const stackFirstItem = (
      <StackItem>
        <Flex>
          <FlexItem>
            <TextContent>
              <Text component={TextVariants.small}>Streaming events...</Text>
            </TextContent>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            <TextContent>
              <Text component={TextVariants.small}>
                Showing <Pluralize singular={'event'} count={eventItems.length} />
              </Text>
            </TextContent>
          </FlexItem>
        </Flex>
      </StackItem>
    );
    const stackLastItem = (
      <StackItem>
        <TextContent>
          <Text component={TextVariants.small}>Older events are not stored.</Text>
        </TextContent>
      </StackItem>
    );

    return (
      <PageSection variant={PageSectionVariants.light}>
        <Stack hasGutter>
          {stackFirstItem}
          {eventItems}
          {stackLastItem}
        </Stack>
      </PageSection>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  allEvents: selectAllEvents(state),
  allWorkspaces: selectAllWorkspaces(state),
  eventsFilterFn: selectEvents(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WorkspaceEvents);
