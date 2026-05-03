/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
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

import { selectLocalDevfiles } from '@/store/LocalDevfiles/selectors';

export const dashboardAiAgentPlugin: FrontendPlugin = {
  manifest: {
    id: 'dashboard-ai-agent',
    name: 'Devfile Creator with AI Agent',
    version: '1.0.0',
    description:
      'Devfile editor with CodeMirror 6, AI agent terminal integration, and workspace loader agent panel',
    enabled: true,
  },
  reducerKey: 'localDevfiles',
  reducer: (state = {}) => state,
  slots: {
    navigationItems: [
      {
        to: '/devfiles',
        label: 'Devfiles',
        labelSelector: (state: unknown) => {
          const devfiles = selectLocalDevfiles(state as Parameters<typeof selectLocalDevfiles>[0]);
          return `Devfiles (${devfiles.length})`;
        },
        insertAfter: '/create-workspace',
      },
    ],
  },
};
