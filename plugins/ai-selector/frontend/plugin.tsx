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

import { FrontendPlugin } from '@eclipse-che/dashboard-plugins';

import React from 'react';

import AiSelector from '@/plugins/ai-selector/components/AiSelector';
import { AiSelectorErrorBoundary } from '@/plugins/ai-selector/components/AiSelector/ErrorBoundary';
import { AiToolIcon } from '@/plugins/ai-selector/components/AiToolIcon';
import AiProviderKeys from '@/plugins/ai-selector/pages/UserPreferences/AiProviderKeys';
import AiToolFormGroup from '@/plugins/ai-selector/pages/WorkspaceDetails/OverviewTab/AiTool';
import { UserPreferencesTab } from '@/services/helpers/types';
import { RootState } from '@/store';
import { aiConfigActionCreators, aiConfigReducer } from '@/plugins/ai-selector/store/AiConfig';
import { selectAiConfigEnabled } from '@/plugins/ai-selector/store/AiConfig/selectors';

const AiSelectorSlot: React.FC<{ onSelect?: (providers: string[]) => void }> = ({ onSelect }) => (
  <AiSelectorErrorBoundary>
    <AiSelector onSelect={onSelect || (() => {})} />
  </AiSelectorErrorBoundary>
);

export const aiSelectorPlugin: FrontendPlugin = {
  manifest: {
    id: 'ai-selector',
    name: 'AI Selector Widget',
    version: '1.0.0',
    description:
      'Allows users to select and inject AI coding tools into workspaces',
    enabled: true,
  },
  reducerKey: 'aiConfig',
  reducer: aiConfigReducer,
  bootstrap: async store => {
    const { requestAiRegistry } = aiConfigActionCreators;
    try {
      await requestAiRegistry()(
        store.dispatch,
        store.getState as () => RootState,
        undefined,
      );
    } catch (e) {
      console.warn('Unable to fetch AI registry.', e);
    }

    const state = store.getState() as RootState;
    const enabled = selectAiConfigEnabled(state);
    if (!enabled) {
      return;
    }

    const { requestAiProviderKeyStatus } = aiConfigActionCreators;
    try {
      await requestAiProviderKeyStatus()(
        store.dispatch,
        store.getState as () => RootState,
        undefined,
      );
    } catch (e) {
      console.warn('Unable to fetch AI provider key status.', e);
    }
  },
  slots: {
    workspaceCreation: AiSelectorSlot,
    workspaceDetailsOverview: AiToolFormGroup,
    workspacesListColumn: {
      name: 'AI Provider(s)',
      component: AiToolIcon,
      visible: (state: unknown) =>
        selectAiConfigEnabled(state as RootState),
    },
    userPreferencesTab: {
      name: 'AI Provider Keys',
      key: UserPreferencesTab.AI_PROVIDER_KEYS,
      component: AiProviderKeys,
      visible: (state: unknown) =>
        selectAiConfigEnabled(state as RootState),
    },
    factoryParams: {
      paramName: 'ai-provider',
      parse: (value: string) =>
        value
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0),
    },
  },
};
