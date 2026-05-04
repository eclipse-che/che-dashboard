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

import { FastifyInstance } from 'fastify';
import { ComponentType, ReactNode } from 'react';
import { Reducer, Store } from 'redux';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
}

export interface BackendPlugin {
  manifest: PluginManifest;
  registerRoutes: (server: FastifyInstance) => Promise<void>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FrontendPlugin {
  manifest: PluginManifest;
  reducerKey: string;
  reducer: Reducer;
  bootstrap?: (store: Store) => Promise<void>;
  slots: PluginSlots;
  workspaceHooks?: WorkspaceHooks;
}

export interface TabDefinition {
  name: string;
  key: string;
  component: ComponentType;
  visible?: (state: unknown) => boolean;
}

export interface ColumnDefinition {
  name: string;
  component: ComponentType<any>;
  visible?: (state: unknown) => boolean;
}

export interface FactoryParamExtension {
  paramName: string;
  parse: (value: string) => string[];
}

export interface NavigationItemDefinition {
  to: string;
  label: string;
  labelSelector?: (state: unknown) => string;
  insertAfter?: string;
}

export interface LoaderTabDefinition {
  key: string;
  title: string;
  component: ComponentType<{ workspace: unknown; isActive: boolean }>;
  insertAfter?: string;
}

export interface PluginSlots {
  workspaceCreation?: ComponentType<any>;
  workspaceDetailsOverview?: ComponentType<any>;
  workspacesListColumn?: ColumnDefinition;
  userPreferencesTab?: TabDefinition;
  factoryParams?: FactoryParamExtension;
  navigationItems?: NavigationItemDefinition[];
  loaderTabs?: LoaderTabDefinition[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface WorkspaceHooks {
  onWorkspaceCreate?: (
    workspace: Record<string, unknown>,
    factoryParams: Record<string, unknown>,
  ) => Record<string, unknown>;
  onWorkspaceStart?: (
    workspace: Record<string, unknown>,
  ) => Record<string, unknown> | null;
}

export interface PluginSlotProps {
  name: keyof PluginSlots;
  props?: Record<string, unknown>;
  children?: ReactNode;
}
