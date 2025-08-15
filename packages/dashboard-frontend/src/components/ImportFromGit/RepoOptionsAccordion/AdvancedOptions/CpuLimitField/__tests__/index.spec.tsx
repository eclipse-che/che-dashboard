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
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });
});

function getComponent(cpuLimit: number) {
  return <CpuLimitField cpuLimit={cpuLimit} onChange={mockOnChange} />;
}
