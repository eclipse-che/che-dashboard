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

import { Divider, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';

import { getSortParams, RowData, SortDirection } from '@/pages/WorkspacesList/Rows';

type ColumnDef = {
  title: string;
  dataLabel: string;
  sortable?: boolean;
  screenReaderText?: string;
};

type Props = {
  columns: ColumnDef[];
  rows: RowData[];
  sortBy: {
    index: number;
    direction: SortDirection;
  };
  onSelect: (isSelected: boolean, rowIndex: number) => void;
  onSort: (index: number, direction: SortDirection) => void;
  toolbar: React.ReactNode;
};

export class WorkspacesTable extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const { columns, rows, sortBy, onSelect, onSort, toolbar } = this.props;

    return (
      <PageSection
        padding={{ default: 'noPadding' }}
        variant={PageSectionVariants.default}
        isFilled={false}
      >
        <Divider component="div" className="pf-u-mt-xl" />
        {toolbar}
        <Table aria-label="Workspaces List Table" variant="compact">
          <Thead>
            <Tr>
              <Th screenReaderText="Select workspace" />
              {columns.map((col, colIndex) =>
                col.screenReaderText ? (
                  <Th key={colIndex} screenReaderText={col.screenReaderText} />
                ) : (
                  <Th
                    key={colIndex}
                    sort={
                      col.sortable
                        ? getSortParams(colIndex, sortBy.index, sortBy.direction, onSort)
                        : undefined
                    }
                  >
                    {col.title}
                  </Th>
                ),
              )}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row, rowIndex) => (
              <Tr key={row.workspaceUID} style={{ verticalAlign: 'middle' }}>
                <Td
                  style={{ verticalAlign: 'inherit' }}
                  select={{
                    rowIndex,
                    onSelect: (_event, isSelected) => onSelect(isSelected, rowIndex),
                    isSelected: row.isSelected,
                    isDisabled: row.isDisabled,
                  }}
                />
                <Td dataLabel="Name">{row.cells.details}</Td>
                <Td dataLabel="Editor">{row.cells.editorIcon}</Td>
                <Td dataLabel="Last Modified">{row.cells.lastModifiedDate}</Td>
                <Td dataLabel="Backup Status">{row.cells.backupStatus}</Td>
                <Td dataLabel="Project(s)">{row.cells.projectsList}</Td>
                <Td>{row.cells.action}</Td>
                <Td isActionCell>{row.cells.actionsDropdown}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PageSection>
    );
  }
}
