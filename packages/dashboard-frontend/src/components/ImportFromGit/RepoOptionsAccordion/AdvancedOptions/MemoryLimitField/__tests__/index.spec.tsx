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

import { NumberInputProps } from '@patternfly/react-core';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';

import {
  MemoryLimitField,
  STEP,
} from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/MemoryLimitField';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);
// mute the outputs
console.error = jest.fn();

jest.mock('@patternfly/react-core', () => {
  return {
    ...jest.requireActual('@patternfly/react-core'),
    NumberInput: (obj: NumberInputProps) => (
      <input
        type="range"
        data-testid={obj['data-testid']}
        value={obj.value}
        onChange={event => {
          if (obj.onChange) {
            obj.onChange(event);
          }
        }}
      />
    ),
  };
});

const mockOnChange = jest.fn();

describe('MemoryLimitField', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('8Gi snapshot', () => {
    const snapshot = createSnapshot(8);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should be init with 8Gi and switched to 32Gi', () => {
    renderComponent(8 * STEP);
    const element = screen.getByTestId('memory-limit-input') as HTMLInputElement;
    const getVal = () => parseInt(element.value);

    expect(element).toBeDefined();
    expect(getVal()).toEqual(8);

    fireEvent.change(element, { target: { value: 32 } });

    expect(getVal()).toEqual(32);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });
});

function getComponent(memoryLimit: number) {
  return <MemoryLimitField memoryLimit={memoryLimit} onChange={mockOnChange} />;
}
