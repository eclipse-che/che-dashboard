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

/**
 * Agent Space is served next to the dashboard and shares its masthead, so a
 * bare "Agent Spaces" heading gives no clue which application is on screen.
 * Every section is named after the application it belongs to instead.
 */
export const APP_TITLE = 'Agent Space';

export const SECTION = {
  GETTING_STARTED: 'Getting Started',
  CREATE: 'Create Agent',
  SANDBOXES: 'Agents',
} as const;

export function pageTitle(section: string): string {
  return `${APP_TITLE}/${section}`;
}
