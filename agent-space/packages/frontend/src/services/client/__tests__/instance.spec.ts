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

import { getSandboxClient, setSandboxClient } from '@/services/client/instance';
import { testClient } from '@/testUtils';

afterEach(() => {
  setSandboxClient(undefined);
});

describe('the sandbox client singleton', () => {
  it('hands back the client that was installed', () => {
    const client = testClient();
    setSandboxClient(client);

    expect(getSandboxClient()).toBe(client);
  });

  it('refuses to answer before the bootstrap installed a client', () => {
    setSandboxClient(undefined);

    expect(() => getSandboxClient()).toThrow('before Agent Space finished starting up');
  });
});
