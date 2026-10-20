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

import {
  Button,
  ButtonVariant,
  Checkbox,
  InputGroup,
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { EllipsisVIcon, PlusCircleIcon, SearchIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/pages/SandboxList/Toolbar/index.module.css';

export type Props = {
  /** The toolbar is reduced to Create Agent while the namespace is empty. */
  hasSandboxes: boolean;
  isAllSelected: boolean;
  isDeleteDisabled: boolean;
  onFilter: (filterValue: string) => void;
  onToggleSelectAll: (isChecked: boolean) => void;
  onBulkDelete: () => void;
  onCreate: () => void;
};

/**
 * The toolbar of the sandbox list, laid out as the dashboard workspace list
 * lays its own out: the select-all tick and the search on the left, the
 * actions in a toggle group that collapses on a narrow screen, and the button
 * that leaves the page pushed to the far end.
 */
export function SandboxListToolbar({
  hasSandboxes,
  isAllSelected,
  isDeleteDisabled,
  onFilter,
  onToggleSelectAll,
  onBulkDelete,
  onCreate,
}: Props): React.ReactElement {
  // What has been typed, which is not what is being filtered on: the filter
  // applies on Enter or on the search button, as it does for workspaces.
  const [filterValue, setFilterValue] = React.useState('');

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'Enter':
          onFilter(filterValue);
          break;
        case 'Escape':
          setFilterValue('');
          onFilter('');
          break;
        default:
          break;
      }
    },
    [filterValue, onFilter],
  );

  return (
    <Toolbar id="sandboxes-list-table-toolbar" style={{ paddingBlockStart: '1rem' }}>
      <ToolbarContent>
        {hasSandboxes && (
          <ToolbarItem className={styles.toolbarCheckbox}>
            <Checkbox
              id="toggle-select-all-sandboxes"
              name="toggle-select-all-sandboxes"
              data-testid="select-all-checkbox"
              aria-label="Toggle: select all agent spaces"
              isChecked={isAllSelected}
              onChange={(_event, isChecked) => onToggleSelectAll(isChecked)}
            />
          </ToolbarItem>
        )}
        {hasSandboxes && (
          <ToolbarItem>
            <InputGroup>
              <TextInput
                name="sandboxes-filter-input"
                id="sandboxes-filter-input"
                data-testid="sandboxes-filter-input"
                type="search"
                aria-label="Search agent spaces"
                placeholder="Search"
                value={filterValue}
                onChange={(_event, value) => setFilterValue(value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                variant={ButtonVariant.control}
                aria-label="Filter agent spaces"
                data-testid="sandboxes-filter-button"
                onClick={() => onFilter(filterValue)}
              >
                <SearchIcon />
              </Button>
            </InputGroup>
          </ToolbarItem>
        )}
        <ToolbarToggleGroup
          className={styles.toolbarToggleGroup}
          breakpoint="md"
          toggleIcon={<EllipsisVIcon />}
        >
          {hasSandboxes && (
            <ToolbarItem>
              <Button
                variant={ButtonVariant.primary}
                aria-label="Delete Selected Agent Spaces"
                data-testid="bulk-delete-button"
                isDisabled={isDeleteDisabled}
                onClick={onBulkDelete}
              >
                Delete
              </Button>
            </ToolbarItem>
          )}
          {/* Last and pushed to the far end, the way the workspace list places
              'Add Workspace': the destructive action stays next to the rows it
              acts on and the one that leaves the page sits out of the way. */}
          <ToolbarItem align={{ default: 'alignEnd' }}>
            <Button
              variant={ButtonVariant.link}
              aria-label="Create Agent"
              data-testid="create-sandbox-button"
              icon={<PlusCircleIcon />}
              iconPosition="left"
              onClick={onCreate}
            >
              Create Agent
            </Button>
          </ToolbarItem>
        </ToolbarToggleGroup>
      </ToolbarContent>
    </Toolbar>
  );
}
