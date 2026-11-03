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

import { APP_TITLE, pageTitle, SECTION } from '@/services/pageTitle';

describe('pageTitle', () => {
  it('names the application in front of the section', () => {
    expect(pageTitle(SECTION.SANDBOXES)).toEqual('Agent Space/Agents');
  });

  it('covers every section of the navigation', () => {
    expect(Object.values(SECTION).map(pageTitle)).toEqual([
      'Agent Space/Getting Started',
      'Agent Space/Create Agent',
      'Agent Space/Agents',
    ]);
  });

  it('builds the title from the application name', () => {
    expect(pageTitle('Anything')).toEqual(`${APP_TITLE}/Anything`);
  });
});
