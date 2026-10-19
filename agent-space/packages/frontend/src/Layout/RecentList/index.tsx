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

import { NavGroup, NavItem } from '@patternfly/react-core';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { DeleteSandboxModal } from '@/components/DeleteSandboxModal';
import { SandboxStatusIndicator } from '@/components/SandboxStatusIndicator';
import { RecentSandboxActions } from '@/Layout/RecentList/Actions';
import styles from '@/Layout/RecentList/index.module.css';
import { buildSandboxDetailsRoute } from '@/Routes';
import { getSandboxPhase } from '@/services/sandbox';
import { Sandbox, SandboxAction } from '@/services/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  sandboxesActionCreators,
  selectSandboxActionPendingName,
  selectSandboxes,
  selectSandboxesDeletingNames,
} from '@/store/Sandboxes';

/** As many as the dashboard keeps in its own recent list. */
export const MAX_RECENT_SANDBOXES = 5;

function byNewestFirst(a: Sandbox, b: Sandbox): number {
  const left = a.metadata.creationTimestamp ?? '';
  const right = b.metadata.creationTimestamp ?? '';
  return right.localeCompare(left);
}

/**
 * The sidebar counterpart of the dashboard's "RECENT WORKSPACES".
 *
 * Clicking an entry opens its details page, which is where its phase, its
 * events and its manifest are.
 */
export function RecentSandboxes(): React.ReactElement | null {
  const sandboxes = useAppSelector(selectSandboxes);
  const pendingName = useAppSelector(selectSandboxActionPendingName);
  const deletingNames = useAppSelector(selectSandboxesDeletingNames);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const [wantDelete, setWantDelete] = React.useState<string | undefined>(undefined);

  const isPending = pendingName !== undefined || deletingNames !== undefined;

  const recent = React.useMemo(
    () => [...sandboxes].sort(byNewestFirst).slice(0, MAX_RECENT_SANDBOXES),
    [sandboxes],
  );

  const handleOpen = React.useCallback(
    (sandbox: Sandbox) => {
      navigate(buildSandboxDetailsRoute(sandbox.metadata.name));
    },
    [navigate],
  );

  const handleRunAction = React.useCallback(
    (name: string, action: SandboxAction) => {
      void dispatch(sandboxesActionCreators.runSandboxAction(name, action));
    },
    [dispatch],
  );

  const handleConfirmDelete = React.useCallback(async () => {
    if (wantDelete === undefined) {
      return;
    }
    await dispatch(sandboxesActionCreators.deleteSandbox(wantDelete));
    setWantDelete(undefined);
  }, [dispatch, wantDelete]);

  if (recent.length === 0) {
    return null;
  }

  return (
    <>
      <NavGroup title="RECENT SANDBOXES" style={{ marginTop: '25px' }}>
        {recent.map(sandbox => {
          const name = sandbox.metadata.name;
          const detailsRoute = buildSandboxDetailsRoute(name);
          return (
            <NavItem
              key={sandbox.metadata.uid ?? name}
              itemId={detailsRoute}
              className={styles.navItem}
              data-testid={`recent-sandbox-${name}`}
              isActive={location.pathname === detailsRoute}
              preventDefault={true}
              tabIndex={0}
              onClick={() => handleOpen(sandbox)}
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key !== 'Enter' && event.key !== ' ') {
                  return;
                }
                // Enter on the kebab, or on an item of its menu, is not a
                // request to open the sandbox.
                if (event.target !== event.currentTarget) {
                  return;
                }
                event.preventDefault();
                handleOpen(sandbox);
              }}
            >
              <span>
                <SandboxStatusIndicator phase={getSandboxPhase(sandbox)} sandboxName={name} />
                <span>{name}</span>
              </span>
              <RecentSandboxActions
                sandbox={sandbox}
                isDisabled={isPending}
                onRunAction={handleRunAction}
                onDelete={setWantDelete}
              />
            </NavItem>
          );
        })}
      </NavGroup>

      <DeleteSandboxModal
        isOpen={wantDelete !== undefined}
        sandboxNames={wantDelete === undefined ? [] : [wantDelete]}
        isDeleting={pendingName !== undefined && pendingName === wantDelete}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setWantDelete(undefined)}
      />
    </>
  );
}
