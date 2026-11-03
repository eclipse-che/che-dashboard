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

import { dashboardRoute } from '@/services/config';

/** Where the dashboard keeps the AI provider API keys. */
const USER_PREFERENCES_ROUTE = '/user-preferences';
const AI_PROVIDER_KEYS_TAB = 'AiProviderKeys';

/**
 * The dashboard page that holds the API keys the selected agents need.
 *
 * Every way of choosing an agent offers this link, so the address is written
 * once: Agent Space stores no keys of its own and has nowhere else to send
 * a user who selected a tool and has no key for it.
 */
export function buildManageKeysUrl(dashboardUrl: string): string {
  return dashboardRoute(dashboardUrl, `${USER_PREFERENCES_ROUTE}?tab=${AI_PROVIDER_KEYS_TAB}`);
}
