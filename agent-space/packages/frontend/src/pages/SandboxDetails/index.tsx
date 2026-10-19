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
  Breadcrumb,
  BreadcrumbItem,
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  Title,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { DeleteSandboxModal } from '@/components/DeleteSandboxModal';
import { ErrorAlert } from '@/components/ErrorAlert';
import { SandboxStatusLabel } from '@/components/SandboxStatusLabel';
import { ConditionsTab } from '@/pages/SandboxDetails/ConditionsTab';
import { EventsTab } from '@/pages/SandboxDetails/EventsTab';
import { ManifestTab } from '@/pages/SandboxDetails/ManifestTab';
import { OverviewTab } from '@/pages/SandboxDetails/OverviewTab';
import { TerminalTab } from '@/pages/SandboxDetails/TerminalTab';
import { DEFAULT_SANDBOX_TAB, isSandboxTab, ROUTE, SANDBOX_TAB } from '@/Routes';
import { pageTitle, SECTION } from '@/services/pageTitle';
import { ACTION_LABELS, getAvailableActions, getSandboxPhase } from '@/services/sandbox';
import { SandboxAction, SandboxPhase } from '@/services/types';
import { selectNamespace } from '@/store/Bootstrap';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  sandboxDetailsActionCreators,
  selectSandboxDetails,
  selectSandboxDetailsError,
  selectSandboxDetailsEvents,
  selectSandboxDetailsEventsError,
  selectSandboxDetailsIsLoading,
  selectSandboxDetailsName,
  selectSandboxDetailsResourceVersion,
} from '@/store/SandboxDetails';
import {
  sandboxesActionCreators,
  selectSandboxActionError,
  selectSandboxActionPendingName,
} from '@/store/Sandboxes';

/**
 * How often the Events tab re-reads, while it is the tab on screen. Events are
 * cheap to list and a sandbox coming up produces them steadily.
 */
export const EVENTS_REFRESH_INTERVAL_MS = 10_000;

/**
 * Read view for a single sandbox, split into tabs the way the dashboard splits
 * workspace details: what it is, what it is made of, and what happened to it.
 *
 * The active tab lives in `?tab=`, so a tab can be bookmarked and shared.
 */
export function SandboxDetails(): React.ReactElement {
  const { name = '' } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const dispatch = useAppDispatch();

  const sandbox = useAppSelector(selectSandboxDetails);
  const events = useAppSelector(selectSandboxDetailsEvents);
  const eventsError = useAppSelector(selectSandboxDetailsEventsError);
  const error = useAppSelector(selectSandboxDetailsError);
  const loadedName = useAppSelector(selectSandboxDetailsName);
  const resourceVersion = useAppSelector(selectSandboxDetailsResourceVersion);
  const pendingName = useAppSelector(selectSandboxActionPendingName);
  const actionError = useAppSelector(selectSandboxActionError);
  const namespace = useAppSelector(selectNamespace);

  // What the store holds still describes the previous sandbox until the first
  // request for this one lands, so the route decides whether it may be shown.
  const isLoading = useAppSelector(selectSandboxDetailsIsLoading) || loadedName !== name;

  const [wantDelete, setWantDelete] = React.useState(false);

  const tabParam = searchParams.get('tab');
  const activeTab = isSandboxTab(tabParam) ? tabParam : DEFAULT_SANDBOX_TAB;

  React.useEffect(() => {
    void dispatch(sandboxDetailsActionCreators.requestSandboxDetails(name));
  }, [dispatch, name]);

  // The sandbox itself is kept current by the namespace watch; its events are
  // not watched, so they are re-read whenever the watch reports a new version.
  // The version the initial load came with is not one of those: its events
  // arrived with it.
  const seen = React.useRef<{ name: string; version: string } | undefined>(undefined);
  React.useEffect(() => {
    if (loadedName !== name || resourceVersion === undefined) {
      return;
    }
    const previous = seen.current;
    seen.current = { name, version: resourceVersion };
    if (previous?.name === name && previous.version !== resourceVersion) {
      void dispatch(sandboxDetailsActionCreators.requestSandboxEvents(name));
    }
  }, [dispatch, loadedName, name, resourceVersion]);

  // The watch is not enough on its own. Nearly every event on this tab is
  // reported against the Pod - pulling, back-off, scheduling - and none of
  // those touch the Sandbox, so its resource version never moves and the
  // effect above never fires. While the tab is open the events are re-read on
  // a timer; closing it stops the polling.
  React.useEffect(() => {
    if (activeTab !== SANDBOX_TAB.EVENTS || loadedName !== name) {
      return;
    }
    const refresh = () => void dispatch(sandboxDetailsActionCreators.requestSandboxEvents(name));
    refresh();
    const timer = window.setInterval(refresh, EVENTS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeTab, dispatch, loadedName, name]);

  const handleTabSelect = React.useCallback(
    (_event: React.MouseEvent<HTMLElement, MouseEvent>, tab: string | number) => {
      setSearchParams({ tab: String(tab) }, { replace: true });
    },
    [setSearchParams],
  );

  const clearError = React.useCallback(
    () => dispatch(sandboxesActionCreators.clearActionError()),
    [dispatch],
  );

  const runAction = React.useCallback(
    async (action: SandboxAction) => {
      await dispatch(sandboxesActionCreators.runSandboxAction(name, action));
    },
    [dispatch, name],
  );

  const handleConfirmDelete = React.useCallback(async () => {
    await dispatch(sandboxesActionCreators.deleteSandbox(name));
    setWantDelete(false);
    navigate(ROUTE.SANDBOXES);
  }, [dispatch, name, navigate]);

  if (isLoading) {
    return (
      <PageSection>
        <EmptyState icon={Spinner} titleText="Loading sandbox" />
      </PageSection>
    );
  }

  if (sandbox === undefined) {
    return (
      <PageSection>
        <ErrorAlert
          title={`Could not load the sandbox '${name}'`}
          error={error ?? { statusCode: 404, message: `Sandbox '${name}' was not found.` }}
        />
        <EmptyState titleText="Sandbox unavailable">
          <EmptyStateBody>
            <Link to={ROUTE.SANDBOXES}>Back to the sandbox list</Link>
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const phase = getSandboxPhase(sandbox);
  const isBusy = pendingName !== undefined;

  // A terminal needs a pod with a process in it, so the tab is only offered
  // while the sandbox runs. A link to `?tab=Terminal` kept from when it did
  // falls back rather than selecting a tab that is not on the page.
  const hasTerminal = phase === SandboxPhase.RUNNING;
  const shownTab =
    activeTab === SANDBOX_TAB.TERMINAL && !hasTerminal ? DEFAULT_SANDBOX_TAB : activeTab;

  return (
    <>
      <PageSection>
        <Stack hasGutter>
          <StackItem>
            <Breadcrumb>
              <BreadcrumbItem to="#" onClick={() => navigate(ROUTE.SANDBOXES)}>
                {pageTitle(SECTION.SANDBOXES)}
              </BreadcrumbItem>
              <BreadcrumbItem isActive>{name}</BreadcrumbItem>
            </Breadcrumb>
          </StackItem>
          <StackItem>
            <Flex>
              <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
                <Title headingLevel="h1" size="2xl">
                  {name}
                </Title>
              </FlexItem>
              <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
                <SandboxStatusLabel phase={phase} sandbox={sandbox} />
              </FlexItem>
              <FlexItem align={{ default: 'alignRight' }}>
                <Flex>
                  {getAvailableActions(phase).map(action => (
                    <FlexItem key={action}>
                      <Button
                        variant={ButtonVariant.secondary}
                        isDisabled={isBusy}
                        isLoading={pendingName === name}
                        onClick={() => void runAction(action)}
                        data-testid={`action-${action}`}
                      >
                        {ACTION_LABELS[action]}
                      </Button>
                    </FlexItem>
                  ))}
                  <FlexItem>
                    <Button
                      variant={ButtonVariant.danger}
                      icon={<TrashIcon />}
                      iconPosition="left"
                      isDisabled={isBusy}
                      onClick={() => setWantDelete(true)}
                      data-testid="delete-button"
                    >
                      Delete
                    </Button>
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <ErrorAlert title="The action failed" error={actionError} onClose={clearError} />
          </StackItem>
        </Stack>
      </PageSection>

      <PageSection>
        <Tabs activeKey={shownTab} onSelect={handleTabSelect} data-testid="sandbox-tabs">
          <Tab eventKey={SANDBOX_TAB.OVERVIEW} title={SANDBOX_TAB.OVERVIEW}>
            <OverviewTab sandbox={sandbox} />
          </Tab>
          <Tab eventKey={SANDBOX_TAB.CONDITIONS} title={SANDBOX_TAB.CONDITIONS}>
            <ConditionsTab sandbox={sandbox} />
          </Tab>
          <Tab eventKey={SANDBOX_TAB.MANIFEST} title={SANDBOX_TAB.MANIFEST}>
            <ManifestTab sandbox={sandbox} />
          </Tab>
          <Tab eventKey={SANDBOX_TAB.EVENTS} title={SANDBOX_TAB.EVENTS}>
            <EventsTab events={events} error={eventsError} />
          </Tab>
          {hasTerminal && (
            <Tab eventKey={SANDBOX_TAB.TERMINAL} title={SANDBOX_TAB.TERMINAL}>
              {/* Mounting this opens a shell, so it waits until the tab is
                  the one on screen rather than opening one per page load. */}
              {shownTab === SANDBOX_TAB.TERMINAL && (
                <TerminalTab namespace={namespace} sandboxName={name} />
              )}
            </Tab>
          )}
        </Tabs>
      </PageSection>

      <DeleteSandboxModal
        isOpen={wantDelete}
        sandboxNames={[name]}
        isDeleting={pendingName === name}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setWantDelete(false)}
      />
    </>
  );
}
