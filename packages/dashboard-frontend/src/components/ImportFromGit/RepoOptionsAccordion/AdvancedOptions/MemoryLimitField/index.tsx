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

import { FormGroup, NumberInput } from '@patternfly/react-core';
import React from 'react';

export const STEP = 1073741824;

const MAX_MEMORY_LIMIT_GI = 512;

export type Props = {
  onChange: (memoryLimit: number) => void;
  memoryLimit: number; // Memory limit in bytes
};
export type State = {
  memoryLimitGi: number | ''; // Memory limit in GiB
};

export class MemoryLimitField extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const memoryLimitGi = this.getMemoryLimitGi();

    this.state = {
      memoryLimitGi,
    };
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    if (prevProps.memoryLimit !== this.props.memoryLimit) {
      if (this.props.memoryLimit < STEP) {
        this.props.onChange(0);
      } else if (this.props.memoryLimit > MAX_MEMORY_LIMIT_GI * STEP) {
        this.props.onChange(MAX_MEMORY_LIMIT_GI * STEP);
      }
      const memoryLimitGi = this.getMemoryLimitGi();
      if (memoryLimitGi !== this.state.memoryLimitGi) {
        this.setState({ memoryLimitGi });
      }
    }
  }

  private handleChange(event: React.FormEvent<HTMLInputElement>) {
    let memoryLimitGi = parseInt((event.target as HTMLInputElement).value, 10);
    if (memoryLimitGi < 0 || isNaN(memoryLimitGi)) {
      memoryLimitGi = 0;
    } else if (memoryLimitGi > MAX_MEMORY_LIMIT_GI) {
      memoryLimitGi = MAX_MEMORY_LIMIT_GI;
    }
    this.updateMemoryLimit(Math.ceil(memoryLimitGi));
  }

  private updateMemoryLimit(memoryLimitGi: number) {
    this.setState({ memoryLimitGi });
    if (memoryLimitGi !== this.state.memoryLimitGi) {
      const memoryLimit = memoryLimitGi * STEP; // Convert Gi to bytes
      this.props.onChange(memoryLimit);
    }
  }

  private onPlus = () => {
    if (this.state.memoryLimitGi === '') {
      this.updateMemoryLimit(1);
      return;
    }
    const newMemoryLimit = Math.min(MAX_MEMORY_LIMIT_GI, this.state.memoryLimitGi + 1);
    this.updateMemoryLimit(newMemoryLimit);
  };

  private onMinus = () => {
    if (this.state.memoryLimitGi === '') {
      return;
    }
    const newMemoryLimit = Math.max(0, this.state.memoryLimitGi - 1);
    this.updateMemoryLimit(newMemoryLimit);
  };

  private getMemoryLimitGi(): number | '' {
    const memoryLimitGi = this.props.memoryLimit / STEP; // Convert bytes to GiB
    if (memoryLimitGi <= 0) {
      return ''; // Default value
    } else if (memoryLimitGi > MAX_MEMORY_LIMIT_GI) {
      return MAX_MEMORY_LIMIT_GI; // Cap at maximum limit
    }

    return Math.round(memoryLimitGi); // Convert bytes to GiB
  }

  private getLabel(memoryLimitGi: number | ''): React.ReactNode {
    return <>Memory&nbsp;Limit&nbsp;({memoryLimitGi ? `${memoryLimitGi}Gi` : 'default'})</>;
  }

  public render() {
    const memoryLimitGi = this.state.memoryLimitGi;
    const label = this.getLabel(memoryLimitGi);

    return (
      <FormGroup label={label}>
        <NumberInput
          value={memoryLimitGi === 0 ? '' : memoryLimitGi}
          min={0}
          step={1}
          max={MAX_MEMORY_LIMIT_GI}
          onMinus={() => this.onMinus()}
          onPlus={() => this.onPlus()}
          onBlur={() => {
            if (memoryLimitGi === 0) {
              this.setState({ memoryLimitGi: '' });
            }
          }}
          onChange={event => this.handleChange(event)}
          inputName="memory-limit"
          data-testid="memory-limit-input"
          allowEmptyInput
        />
      </FormGroup>
    );
  }
}
