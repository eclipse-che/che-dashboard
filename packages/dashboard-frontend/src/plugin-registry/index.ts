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

import { FrontendPlugin, LoaderTabDefinition, NavigationItemDefinition } from '@eclipse-che/dashboard-plugins';
import { Store } from 'redux';

const frontendPlugins: FrontendPlugin[] = [];

export function registerFrontendPlugin(plugin: FrontendPlugin): void {
  if (!plugin.manifest.enabled) {
    return;
  }
  frontendPlugins.push(plugin);
}

export function getRegisteredFrontendPlugins(): FrontendPlugin[] {
  return frontendPlugins;
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

export function getPluginTabs(): Array<{
  pluginId: string;
  name: string;
  tabKey: string;
  component: React.ComponentType;
  visible?: (state: unknown) => boolean;
}> {
  const tabs: Array<{
    pluginId: string;
    name: string;
    tabKey: string;
    component: React.ComponentType;
    visible?: (state: unknown) => boolean;
  }> = [];

  for (const plugin of frontendPlugins) {
    const tab = plugin.slots.userPreferencesTab;
    if (tab) {
      tabs.push({
        pluginId: plugin.manifest.id,
        name: tab.name,
        tabKey: tab.key,
        component: tab.component,
        visible: tab.visible,
      });
    }
  }
  return tabs;
}

export function getPluginNavigationItems(): NavigationItemDefinition[] {
  const items: NavigationItemDefinition[] = [];
  for (const plugin of frontendPlugins) {
    if (plugin.slots.navigationItems) {
      items.push(...plugin.slots.navigationItems);
    }
  }
  return items;
}

export function getPluginLoaderTabs(): LoaderTabDefinition[] {
  const tabs: LoaderTabDefinition[] = [];
  for (const plugin of frontendPlugins) {
    if (plugin.slots.loaderTabs) {
      tabs.push(...plugin.slots.loaderTabs);
    }
  }
  return tabs;
}
