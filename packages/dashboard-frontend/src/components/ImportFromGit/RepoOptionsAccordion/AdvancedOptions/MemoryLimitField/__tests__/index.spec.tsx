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

import { NumberInputProps } from '@patternfly/react-core';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';

import {
  MAX_MEMORY_LIMIT_GI,
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
        min={obj.min}
        max={obj.max}
        step={obj.step}
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
    expect(mockOnChange).toHaveBeenCalledWith(32 * STEP);
  });

  it('should limit minimum value as 0', () => {
    renderComponent(STEP);
    const element = screen.getByTestId('memory-limit-input') as HTMLInputElement;

    fireEvent.change(element, { target: { value: -99 } });

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('should limit maximum value as MAX_MEMORY_LIMIT_GI=99999', () => {
    renderComponent(STEP);
    const element = screen.getByTestId('memory-limit-input') as HTMLInputElement;

    fireEvent.change(element, { target: { value: 1111111 } });

    expect(MAX_MEMORY_LIMIT_GI).toEqual(99999);
    expect(mockOnChange).toHaveBeenCalledWith(99999 * STEP);
  });
});

function getComponent(memoryLimit: number) {
  return <MemoryLimitField memoryLimit={memoryLimit} onChange={mockOnChange} />;
}
