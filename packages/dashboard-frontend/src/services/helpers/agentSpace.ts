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
 * Path segment the Agent Space MVP bundle is served from, relative to the dashboard root.
 * The bundle is built by the standalone `agent-space` project and deployed
 * next to the dashboard assets, e.g. `/dashboard/agent-space/`.
 */
export const AGENT_SPACE_PATH_SEGMENT = 'agent-space';

/**
 * Builds the absolute path of the Agent Space application.
 *
 * The Agent Space MVP is a separate single-page application, so it cannot be reached
 * through the dashboard router. The URL is derived from the current location to keep
 * working no matter which base path the dashboard is deployed under.
 */
export function buildAgentSpaceUrl(pathname = window.location.pathname): string {
  const withoutFile = pathname.replace(/[^/]*$/, '');
  const base = withoutFile.endsWith('/') ? withoutFile : `${withoutFile}/`;
  return `${base}${AGENT_SPACE_PATH_SEGMENT}/`;
}
