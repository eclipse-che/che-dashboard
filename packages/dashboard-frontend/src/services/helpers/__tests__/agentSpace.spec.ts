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

import { buildAgentSpaceUrl } from '@/services/helpers/agentSpace';

describe('buildAgentSpaceUrl', () => {
  it('should append the segment to a directory path', () => {
    expect(buildAgentSpaceUrl('/dashboard/')).toEqual('/dashboard/agent-space/');
  });

  it('should drop the file name from the path', () => {
    expect(buildAgentSpaceUrl('/dashboard/index.html')).toEqual('/dashboard/agent-space/');
  });

  it('should respect a custom base path', () => {
    expect(buildAgentSpaceUrl('/che/dashboard/')).toEqual('/che/dashboard/agent-space/');
  });

  it('should handle the root path', () => {
    expect(buildAgentSpaceUrl('/')).toEqual('/agent-space/');
  });
});
