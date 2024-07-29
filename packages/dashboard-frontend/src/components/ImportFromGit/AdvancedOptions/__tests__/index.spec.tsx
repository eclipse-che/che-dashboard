/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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

import { AdvancedOptions } from '@/components/ImportFromGit/AdvancedOptions';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot } = getComponentRenderer(getComponent);

jest.mock('@/components/ImportFromGit/AdvancedOptions/ContainerImageField');
jest.mock('@/components/ImportFromGit/AdvancedOptions/CpuLimitField');
jest.mock('@/components/ImportFromGit/AdvancedOptions/MemoryLimitField');
jest.mock('@/components/ImportFromGit/AdvancedOptions/TemporaryStorageField');
jest.mock('@/components/ImportFromGit/AdvancedOptions/CreateNewIfExistingField');

const mockOnChange = jest.fn();

describe('AdvancedOptions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot with default values', () => {
    const snapshot = createSnapshot();
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot with all values', () => {
    const snapshot = createSnapshot('testimage', true, true, 4718592, 2);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });
});

function getComponent(
  containerImage?: string | undefined,
  temporaryStorage?: boolean | undefined,
  createNewIfExisting?: boolean | undefined,
  memoryLimit?: number | undefined,
  cpuLimit?: number | undefined,
) {
  return (
    <AdvancedOptions
      containerImage={containerImage}
      temporaryStorage={temporaryStorage}
      createNewIfExisting={createNewIfExisting}
      memoryLimit={memoryLimit}
      cpuLimit={cpuLimit}
      onChange={mockOnChange}
    />
  );
}
