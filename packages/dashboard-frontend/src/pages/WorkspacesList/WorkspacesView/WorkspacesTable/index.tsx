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
import { SortByDirection, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';

type RowData = {
  cells: { title: React.ReactNode; key: string }[];
  props: { workspaceUID: string };
  selected?: boolean;
  disableSelection?: boolean;
};

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
    direction: SortByDirection;
  };
  onSelect: (isSelected: boolean, rowIndex: number) => void;
  onSort: (index: number, direction: SortByDirection) => void;
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
                        ? {
                            sortBy: {
                              index: sortBy.index,
                              direction: sortBy.direction,
                            },
                            onSort: (_event, index, direction) => onSort(index, direction),
                            columnIndex: colIndex,
                          }
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
              <Tr key={row.props.workspaceUID} style={{ verticalAlign: 'middle' }}>
                <Td
                  style={{ verticalAlign: 'inherit' }}
                  select={{
                    rowIndex,
                    onSelect: (_event, isSelected) => onSelect(isSelected, rowIndex),
                    isSelected: row.selected === true,
                    isDisabled: row.disableSelection === true,
                  }}
                />
                {row.cells.map(
                  (cell: { title: React.ReactNode; key: string }, cellIndex: number) => (
                    <Td key={cell.key} dataLabel={columns[cellIndex]?.dataLabel}>
                      {cell.title}
                    </Td>
                  ),
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PageSection>
    );
  }
}
