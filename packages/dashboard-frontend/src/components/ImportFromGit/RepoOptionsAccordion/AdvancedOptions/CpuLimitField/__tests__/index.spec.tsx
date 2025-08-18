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

import { CpuLimitField } from '@/components/ImportFromGit/RepoOptionsAccordion/AdvancedOptions/CpuLimitField';
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

describe('CpuLimitField', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('2Gi snapshot', () => {
    const snapshot = createSnapshot(2);
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  it('should be init with 2Gi and switched to 8Gi', () => {
    renderComponent(2);
    const element = screen.getByTestId('cpu-limit-input') as HTMLInputElement;
    const getVal = () => parseInt(element.value);

    expect(element).toBeDefined();
    expect(getVal()).toEqual(2);

    fireEvent.change(element, { target: { value: 8 } });

    expect(getVal()).toEqual(8);
    expect(mockOnChange).toHaveBeenCalledWith(8);
  });

  it('should limit minimum value as 0', () => {
    renderComponent(1);
    const element = screen.getByTestId('cpu-limit-input') as HTMLInputElement;

    fireEvent.change(element, { target: { value: -99 } });

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('should limit maximum value as 64', () => {
    renderComponent(1);
    const element = screen.getByTestId('cpu-limit-input') as HTMLInputElement;

    fireEvent.change(element, { target: { value: 9999 } });

    expect(mockOnChange).toHaveBeenCalledWith(64);
  });
});

function getComponent(cpuLimit: number) {
  return <CpuLimitField cpuLimit={cpuLimit} onChange={mockOnChange} />;
}
