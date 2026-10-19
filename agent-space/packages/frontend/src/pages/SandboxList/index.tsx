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
  Button,
  ButtonVariant,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { CubesIcon, SearchIcon } from '@patternfly/react-icons';
import { ActionsColumn, IAction, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AiToolIcon } from '@/components/AiToolIcon';
import { DeleteSandboxModal } from '@/components/DeleteSandboxModal';
import { ErrorAlert } from '@/components/ErrorAlert';
import { SandboxStatusLabel } from '@/components/SandboxStatusLabel';
import { SandboxListToolbar } from '@/pages/SandboxList/Toolbar';
import { buildSandboxDetailsRoute, ROUTE } from '@/Routes';
import match from '@/services/filter';
import { formatAge } from '@/services/format';
import { pageTitle, SECTION } from '@/services/pageTitle';
import { getSandboxAiProviderIds, getSandboxImages, getSandboxPhase } from '@/services/sandbox';
import { buildSandboxActionItems } from '@/services/sandboxActions';
import { Sandbox, SandboxAction } from '@/services/types';
import { selectAiProviders, selectAiTools } from '@/store/Catalog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  sandboxesActionCreators,
  selectSandboxActionError,
  selectSandboxActionPendingName,
  selectSandboxes,
  selectSandboxesDeletingNames,
  selectSandboxesError,
  selectSandboxesIsLoading,
} from '@/store/Sandboxes';

/**
 * Lists the sandboxes of the current namespace with their phase and the
 * lifecycle actions that phase allows.
 */
export function SandboxList(): React.ReactElement {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const sandboxes = useAppSelector(selectSandboxes);
  const isLoading = useAppSelector(selectSandboxesIsLoading);
  const error = useAppSelector(selectSandboxesError);
  const pendingName = useAppSelector(selectSandboxActionPendingName);
  const deletingNames = useAppSelector(selectSandboxesDeletingNames);
  const actionError = useAppSelector(selectSandboxActionError);
  const aiTools = useAppSelector(selectAiTools);
  const aiProviders = useAppSelector(selectAiProviders);

  const [wantDelete, setWantDelete] = React.useState<string[] | undefined>(undefined);
  const [checkedNames, setCheckedNames] = React.useState<string[]>([]);
  const [filterValue, setFilterValue] = React.useState('');

  const isPending = pendingName !== undefined || deletingNames !== undefined;

  const visibleSandboxes = React.useMemo(
    () =>
      filterValue === ''
        ? sandboxes
        : sandboxes.filter(sandbox => match(sandbox.metadata.name, filterValue)),
    [filterValue, sandboxes],
  );

  // A sandbox the watch has removed, or the filter has hidden, must not keep a
  // tick the toolbar would act on, so the selection is derived rather than
  // stored on its own.
  const selectedNames = React.useMemo(
    () => checkedNames.filter(name => visibleSandboxes.some(item => item.metadata.name === name)),
    [checkedNames, visibleSandboxes],
  );

  const clearError = React.useCallback(
    () => dispatch(sandboxesActionCreators.clearActionError()),
    [dispatch],
  );

  // Nothing is read back afterwards: the watch reports what the controller
  // actually did, which is not necessarily what the action asked for.
  const runAction = React.useCallback(
    (name: string, action: SandboxAction) => {
      void dispatch(sandboxesActionCreators.runSandboxAction(name, action));
    },
    [dispatch],
  );

  const handleConfirmDelete = React.useCallback(async () => {
    if (wantDelete === undefined) {
      return;
    }
    await dispatch(sandboxesActionCreators.deleteSandboxes(wantDelete));
    setCheckedNames(current => current.filter(name => !wantDelete.includes(name)));
    setWantDelete(undefined);
  }, [dispatch, wantDelete]);

  const handleCheck = React.useCallback((name: string, isChecked: boolean) => {
    setCheckedNames(current =>
      isChecked ? [...current, name] : current.filter(item => item !== name),
    );
  }, []);

  const handleCheckAll = React.useCallback(
    (isChecked: boolean) =>
      setCheckedNames(isChecked ? visibleSandboxes.map(sandbox => sandbox.metadata.name) : []),
    [visibleSandboxes],
  );

  const buildActions = React.useCallback(
    (sandbox: Sandbox): IAction[] =>
      buildSandboxActionItems({
        sandbox,
        isDisabled: isPending,
        onRunAction: runAction,
        onDelete: name => setWantDelete([name]),
      }).map(item =>
        item.kind === 'separator'
          ? { isSeparator: true }
          : {
              title: item.title,
              isDisabled: item.isDisabled,
              onClick: item.onSelect,
            },
      ),
    [isPending, runAction],
  );

  if (isLoading) {
    return (
      <PageSection>
        <EmptyState icon={Spinner} titleText="Loading sandboxes" />
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Title headingLevel="h1" size="2xl">
        {pageTitle(SECTION.SANDBOXES)}
      </Title>

      <ErrorAlert title="Could not load the sandboxes" error={error} />
      <ErrorAlert title="The action failed" error={actionError} onClose={clearError} />

      {/* The toolbar sits right under the heading, so it carries the gap
          between the two rather than the title carrying a bottom margin. */}
      <SandboxListToolbar
        hasSandboxes={sandboxes.length > 0}
        isAllSelected={
          visibleSandboxes.length > 0 && selectedNames.length === visibleSandboxes.length
        }
        isDeleteDisabled={selectedNames.length === 0 || isPending}
        onFilter={setFilterValue}
        onToggleSelectAll={handleCheckAll}
        onBulkDelete={() => setWantDelete(selectedNames)}
        onCreate={() => navigate(ROUTE.CREATE)}
      />

      {sandboxes.length > 0 && visibleSandboxes.length === 0 && (
        <EmptyState
          variant={EmptyStateVariant.sm}
          icon={SearchIcon}
          titleText="Nothing Found"
          data-testid="nothing-found"
        >
          <EmptyStateBody>
            No sandboxes match the filter criteria. Clear filter to show results.
          </EmptyStateBody>
        </EmptyState>
      )}

      {sandboxes.length === 0 && error === undefined ? (
        <EmptyState icon={CubesIcon} titleText="No sandboxes yet">
          <EmptyStateBody>
            Create your first Agent Sandbox from a sample or with the wizard.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant={ButtonVariant.primary}
                onClick={() => navigate(ROUTE.GETTING_STARTED)}
                data-testid="empty-getting-started-button"
              >
                Browse samples
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <Table aria-label="Agent Sandboxes" variant="compact" data-testid="sandboxes-table">
          <Thead>
            <Tr>
              <Th screenReaderText="Row select" />
              <Th>Status</Th>
              <Th>Name</Th>
              <Th>AI Provider(s)</Th>
              <Th>Image</Th>
              <Th>Age</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {visibleSandboxes.map((sandbox, rowIndex) => {
              const name = sandbox.metadata.name;
              return (
                <Tr key={sandbox.metadata.uid ?? name} data-testid={`sandbox-row-${name}`}>
                  <Td
                    select={{
                      rowIndex,
                      isSelected: selectedNames.includes(name),
                      onSelect: (_event, isSelected) => handleCheck(name, isSelected),
                    }}
                  />
                  <Td dataLabel="Status">
                    <SandboxStatusLabel phase={getSandboxPhase(sandbox)} sandbox={sandbox} />
                  </Td>
                  <Td dataLabel="Name">
                    <Link to={buildSandboxDetailsRoute(name)}>{name}</Link>
                  </Td>
                  <Td dataLabel="AI Provider(s)">
                    <AiToolIcon
                      providerIds={getSandboxAiProviderIds(sandbox)}
                      aiTools={aiTools}
                      aiProviders={aiProviders}
                    />
                  </Td>
                  <Td dataLabel="Image">
                    <Content component="small">
                      {getSandboxImages(sandbox).join(', ') || '-'}
                    </Content>
                  </Td>
                  <Td dataLabel="Age">{formatAge(sandbox.metadata.creationTimestamp)}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <ActionsColumn items={buildActions(sandbox)} />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      <DeleteSandboxModal
        isOpen={wantDelete !== undefined}
        sandboxNames={wantDelete ?? []}
        isDeleting={deletingNames !== undefined}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setWantDelete(undefined)}
      />
    </PageSection>
  );
}
