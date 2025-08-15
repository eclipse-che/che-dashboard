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

const MAX_CPU_LIMIT = 64;

export type Props = {
  onChange: (cpuLimit: number) => void;
  cpuLimit: number;
};
export type State = {
  cpuLimit: number;
};

export class CpuLimitField extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      cpuLimit: this.props.cpuLimit,
    };
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    const { cpuLimit } = this.props;
    if (prevProps.cpuLimit !== cpuLimit && cpuLimit !== this.state.cpuLimit) {
      if (this.props.cpuLimit < 0) {
        this.props.onChange(0); // Reset to 0 if negative value
        return;
      }
      this.setState({ cpuLimit });
    }
  }

  private handleChange(event: React.FormEvent<HTMLInputElement>) {
    let cpuLimit = parseInt((event.target as HTMLInputElement).value, 10);
    if (cpuLimit < 0 || isNaN(cpuLimit)) {
      cpuLimit = 0;
    } else if (cpuLimit > MAX_CPU_LIMIT) {
      cpuLimit = MAX_CPU_LIMIT;
    }
    this.updateCpuLimit(cpuLimit);
  }

  private updateCpuLimit(cpuLimit: number) {
    if (cpuLimit !== this.state.cpuLimit) {
      this.setState({ cpuLimit });
      this.props.onChange(cpuLimit);
    }
  }

  private onPlus = () => {
    const cpuLimit = Math.min(MAX_CPU_LIMIT, this.state.cpuLimit + 1);
    this.updateCpuLimit(cpuLimit);
  };

  private onMinus = () => {
    const cpuLimit = Math.max(0, this.state.cpuLimit - 1);
    this.updateCpuLimit(cpuLimit);
  };

  private getLabel(cpuLimit: number): string {
    const label = 'CPU Limit';
    if (cpuLimit === 0) {
      return `${label} (default)`;
    } else if (cpuLimit === 1) {
      return `${label} (1 core)`;
    }

    return `${label} (${cpuLimit} cores)`;
  }

  public render() {
    const cpuLimit = this.state.cpuLimit;
    const label = this.getLabel(cpuLimit);

    return (
      <FormGroup label={label}>
        <NumberInput
          value={cpuLimit === 0 ? '' : cpuLimit}
          min={0}
          step={1}
          max={MAX_CPU_LIMIT}
          onMinus={() => this.onMinus()}
          onPlus={() => this.onPlus()}
          onChange={event => this.handleChange(event)}
          inputName="cpu-limit"
          data-testid="cpu-limit-input"
          allowEmptyInput
        />
      </FormGroup>
    );
  }
}
