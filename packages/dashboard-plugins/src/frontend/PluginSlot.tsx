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

import { getRegisteredFrontendPlugins } from '../registry';
import {
  FrontendPlugin,
  LoaderTabDefinition,
  NavigationItemDefinition,
  PluginSlotProps,
  PluginSlots,
} from '../types';

function collectFromPlugins<T, R>(
  extractor: (slots: PluginSlots) => T | undefined,
  mapper: (plugin: FrontendPlugin, value: T) => R,
): R[] {
  const plugins = getRegisteredFrontendPlugins();
  const results: R[] = [];
  for (const plugin of plugins) {
    const value = extractor(plugin.slots);
    if (value !== undefined) {
      results.push(mapper(plugin, value));
    }
  }
  return results;
}

export const PluginSlot: React.FC<PluginSlotProps> = ({ name, props = {} }) => {
  const plugins = getRegisteredFrontendPlugins();

  return (
    <>
      {plugins.map(plugin => {
        const slotValue = plugin.slots[name];
        if (!slotValue) {
          return null;
        }

        if (
          name === 'workspaceCreation' ||
          name === 'workspaceDetailsOverview'
        ) {
          const SlotComponent = slotValue as React.ComponentType<
            Record<string, unknown>
          >;
          return <SlotComponent key={plugin.manifest.id} {...props} />;
        }

        return null;
      })}
    </>
  );
};

export function getPluginTabs(): Array<{
  pluginId: string;
  name: string;
  tabKey: string;
  component: React.ComponentType;
  visible?: (state: unknown) => boolean;
}> {
  return collectFromPlugins(
    slots => slots.userPreferencesTab,
    (plugin, tab) => ({
      pluginId: plugin.manifest.id,
      name: tab.name,
      tabKey: tab.key,
      component: tab.component,
      visible: tab.visible,
    }),
  );
}

export function getPluginColumns(): Array<{
  pluginId: string;
  name: string;
  component: React.ComponentType<Record<string, unknown>>;
  visible?: (state: unknown) => boolean;
}> {
  return collectFromPlugins(
    slots => slots.workspacesListColumn,
    (plugin, col) => ({
      pluginId: plugin.manifest.id,
      name: col.name,
      component: col.component,
      visible: col.visible,
    }),
  );
}

export function getPluginNavigationItems(): NavigationItemDefinition[] {
  const plugins = getRegisteredFrontendPlugins();
  const items: NavigationItemDefinition[] = [];
  for (const plugin of plugins) {
    if (plugin.slots.navigationItems) {
      items.push(...plugin.slots.navigationItems);
    }
  }
  return items;
}

export function getPluginLoaderTabs(): LoaderTabDefinition[] {
  const plugins = getRegisteredFrontendPlugins();
  const tabs: LoaderTabDefinition[] = [];
  for (const plugin of plugins) {
    if (plugin.slots.loaderTabs) {
      tabs.push(...plugin.slots.loaderTabs);
    }
  }
  return tabs;
}
