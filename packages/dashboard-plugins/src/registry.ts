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

import { Reducer, Store } from 'redux';

import { BackendPlugin, FrontendPlugin } from './types';

const backendPlugins: BackendPlugin[] = [];
const frontendPlugins: FrontendPlugin[] = [];

export function registerBackendPlugin(plugin: BackendPlugin): void {
  if (!plugin.manifest.enabled) {
    return;
  }
  backendPlugins.push(plugin);
}

export function registerFrontendPlugin(plugin: FrontendPlugin): void {
  console.log(`[PluginSystem] Registering plugin: ${plugin.manifest.id} (enabled=${plugin.manifest.enabled})`);
  if (!plugin.manifest.enabled) {
    return;
  }
  frontendPlugins.push(plugin);
  console.log(`[PluginSystem] Total registered plugins: ${frontendPlugins.length}`);
}

export function getRegisteredBackendPlugins(): BackendPlugin[] {
  return [...backendPlugins];
}

export function getRegisteredFrontendPlugins(): FrontendPlugin[] {
  console.log(`[PluginSystem] getRegisteredFrontendPlugins called, count=${frontendPlugins.length}`);
  return [...frontendPlugins];
}

export function getPluginReducers(): Record<string, Reducer> {
  const reducers: Record<string, Reducer> = {};
  for (const plugin of frontendPlugins) {
    reducers[plugin.reducerKey] = plugin.reducer;
  }
  return reducers;
}

export async function bootstrapPlugins(store: Store): Promise<void> {
  const results = await Promise.allSettled(
    frontendPlugins
      .filter(p => p.bootstrap !== undefined)
      .map(p => p.bootstrap!(store)),
  );
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Plugin bootstrap failed:', result.reason);
    }
  }
}

export function runPluginCreateHooks(
  workspace: Record<string, unknown>,
  factoryParams: Record<string, unknown>,
): Record<string, unknown> {
  let result = workspace;
  for (const plugin of frontendPlugins) {
    if (plugin.workspaceHooks?.onWorkspaceCreate) {
      result = plugin.workspaceHooks.onWorkspaceCreate(result, factoryParams);
    }
  }
  return result;
}

export function runPluginStartHooks(
  workspace: Record<string, unknown>,
): Record<string, unknown> | null {
  let result: Record<string, unknown> | null = workspace;
  for (const plugin of frontendPlugins) {
    if (plugin.workspaceHooks?.onWorkspaceStart && result !== null) {
      result = plugin.workspaceHooks.onWorkspaceStart(result);
    }
  }
  return result;
}

export function getPluginFactoryParams(): Array<{
  paramName: string;
  parse: (value: string) => string[];
}> {
  return frontendPlugins
    .filter(p => p.slots.factoryParams !== undefined)
    .map(p => p.slots.factoryParams!);
}
