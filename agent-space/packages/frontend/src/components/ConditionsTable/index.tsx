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

import { Content, Label } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';

import { formatTimestamp } from '@/services/format';
import { ConditionStatus, SandboxCondition } from '@/services/types';

const STATUS_COLOR: Record<ConditionStatus, 'green' | 'red' | 'grey'> = {
  True: 'green',
  False: 'red',
  Unknown: 'grey',
};

export type Props = {
  conditions: SandboxCondition[];
};

export function ConditionsTable({ conditions }: Props): React.ReactElement {
  if (conditions.length === 0) {
    return (
      <Content component="p" data-testid="no-conditions">
        The controller has not reported any conditions for this sandbox yet.
      </Content>
    );
  }

  return (
    <Table aria-label="Sandbox conditions" variant="compact" data-testid="conditions-table">
      <Thead>
        <Tr>
          <Th>Type</Th>
          <Th>Status</Th>
          <Th>Reason</Th>
          <Th>Message</Th>
          <Th>Last transition</Th>
        </Tr>
      </Thead>
      <Tbody>
        {conditions.map(condition => (
          <Tr key={`${condition.type}-${condition.lastTransitionTime ?? ''}`}>
            <Td dataLabel="Type">{condition.type}</Td>
            <Td dataLabel="Status">
              <Label isCompact color={STATUS_COLOR[condition.status] ?? 'grey'}>
                {condition.status}
              </Label>
            </Td>
            <Td dataLabel="Reason">{condition.reason ?? '-'}</Td>
            <Td dataLabel="Message">{condition.message ?? '-'}</Td>
            <Td dataLabel="Last transition">{formatTimestamp(condition.lastTransitionTime)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
