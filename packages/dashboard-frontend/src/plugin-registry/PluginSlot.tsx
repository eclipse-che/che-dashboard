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

import { getRegisteredFrontendPlugins } from '@/plugin-registry';

interface PluginSlotProps {
  name: 'workspaceCreation' | 'workspaceDetailsOverview';
  props?: Record<string, unknown>;
}

export const PluginSlot: React.FC<PluginSlotProps> = ({ name, props = {} }) => {
  const plugins = getRegisteredFrontendPlugins();

  return (
    <>
      {plugins.map(plugin => {
        const SlotComponent = plugin.slots[name];
        if (!SlotComponent) {
          return null;
        }
        return <SlotComponent key={plugin.manifest.id} {...props} />;
      })}
    </>
  );
};
