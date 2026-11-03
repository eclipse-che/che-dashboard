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

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ConditionsTab } from '@/pages/SandboxDetails/ConditionsTab';
import { Sandbox, SandboxCondition } from '@/services/types';

function sandbox(conditions?: SandboxCondition[]): Sandbox {
  return {
    apiVersion: 'agents.x-k8s.io/v1beta1',
    kind: 'Sandbox',
    metadata: { name: 'hello-world', namespace: 'user-che' },
    spec: { podTemplate: { spec: { containers: [] } } },
    status: conditions === undefined ? {} : { conditions },
  };
}

describe('ConditionsTab', () => {
  it('lists what the controller reported', () => {
    render(
      <ConditionsTab
        sandbox={sandbox([
          {
            type: 'SandboxReady',
            status: 'True',
            reason: 'Ready',
            message: 'The sandbox is ready.',
          },
        ])}
      />,
    );

    expect(screen.getByTestId('conditions-table')).toHaveTextContent('SandboxReady');
  });

  it('copes with a sandbox the controller has not reported on yet', () => {
    render(<ConditionsTab sandbox={sandbox()} />);

    expect(screen.getByTestId('conditions-tab')).toBeInTheDocument();
  });
});
