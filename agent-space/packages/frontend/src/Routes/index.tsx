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
import { Navigate, Route, Routes } from 'react-router-dom';

import { CreateSandbox } from '@/pages/CreateSandbox';
import { GettingStarted } from '@/pages/GettingStarted';
import { SandboxDetails } from '@/pages/SandboxDetails';
import { SandboxList } from '@/pages/SandboxList';

export enum ROUTE {
  GETTING_STARTED = '/getting-started',
  CREATE = '/create',
  SANDBOXES = '/sandboxes',
  SANDBOX_DETAILS = '/sandboxes/:name',
}

/**
 * Tabs of the sandbox details page. The value is both the tab label and the
 * `?tab=` query parameter, so a tab can be linked to and survives a reload -
 * the same contract the dashboard's workspace details page uses.
 */
export enum SANDBOX_TAB {
  OVERVIEW = 'Overview',
  CONDITIONS = 'Conditions',
  MANIFEST = 'Manifest',
  EVENTS = 'Events',
  TERMINAL = 'Terminal',
}

export const DEFAULT_SANDBOX_TAB = SANDBOX_TAB.OVERVIEW;

export function isSandboxTab(value: unknown): value is SANDBOX_TAB {
  return Object.values<unknown>(SANDBOX_TAB).includes(value);
}

export function buildSandboxDetailsRoute(name: string, tab?: SANDBOX_TAB): string {
  const path = `/sandboxes/${encodeURIComponent(name)}`;
  return tab === undefined ? path : `${path}?tab=${tab}`;
}

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path={ROUTE.GETTING_STARTED} element={<GettingStarted />} />
      <Route path={ROUTE.CREATE} element={<CreateSandbox />} />
      <Route path={ROUTE.SANDBOXES} element={<SandboxList />} />
      <Route path={ROUTE.SANDBOX_DETAILS} element={<SandboxDetails />} />
      <Route path="*" element={<Navigate to={ROUTE.SANDBOXES} replace />} />
    </Routes>
  );
}
