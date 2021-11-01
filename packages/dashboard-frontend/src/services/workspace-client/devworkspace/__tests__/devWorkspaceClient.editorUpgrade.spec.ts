/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { container } from '../../../../inversify.config';
import { DevWorkspaceBuilder } from '../../../../store/__mocks__/devWorkspaceBuilder';
import { DevWorkspaceClient } from '../devWorkspaceClient';
import template from './__mocks__/devWorkspaceSpecTemplates';

describe('DevWorkspace client, editor upgrade', () => {
  let client: DevWorkspaceClient;

  beforeEach(() => {
    client = container.get(DevWorkspaceClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should returns patch for editor update', async () => {
    const testWorkspace = new DevWorkspaceBuilder().withTemplate(template).build();

    const patch = await client.upgradeDevWorkspaceTemplate(testWorkspace);

    expect(patch).toEqual({
      op: 'replace',
      path: '/spec/template',
      value: template,
    });
  });
});
