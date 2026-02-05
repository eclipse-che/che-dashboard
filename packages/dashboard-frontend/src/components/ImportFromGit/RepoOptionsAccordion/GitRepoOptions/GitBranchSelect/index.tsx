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
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInput,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import React from 'react';

export type Props = {
  onChange: (definition: string | undefined) => void;
  gitBranch: string | undefined;
  branchList: string[] | undefined;
};
export type State = {
  isOpen: boolean;
  gitBranch: string | undefined;
  filterValue: string;
};

export class GitBranchSelect extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      gitBranch: this.props.gitBranch,
      isOpen: false,
      filterValue: '',
    };
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    const { gitBranch } = this.props;
    if (prevProps.gitBranch !== gitBranch) {
      if (gitBranch && this.props.branchList && this.props.branchList.indexOf(gitBranch) < 0) {
        this.setState({ gitBranch: undefined });
      } else {
        this.setState({ gitBranch });
      }
    }
  }

  private handleChange(value: string) {
    let gitBranch: string | undefined = value.trim();
    gitBranch = gitBranch !== '' ? gitBranch : undefined;
    if (gitBranch !== this.state.gitBranch) {
      this.setState({ gitBranch: value });
      this.props.onChange(value);
    }
  }

  private onClick(branch: string): void {
    this.handleChange(branch);
    this.setState({ isOpen: false, filterValue: '' });
  }

  private buildSelectOptions(): React.ReactElement[] | undefined {
    const { branchList } = this.props;
    const { filterValue } = this.state;

    if (branchList) {
      const filtered = filterValue
        ? branchList.filter(branch => branch.toLowerCase().includes(filterValue.toLowerCase()))
        : branchList;

      return filtered.map(branch => {
        return (
          <SelectOption key={branch} value={branch}>
            {branch}
          </SelectOption>
        );
      });
    }
  }

  public render() {
    const { isOpen, gitBranch, filterValue } = this.state;
    const selectOptions = this.buildSelectOptions();
    const isDisabled = selectOptions === undefined || selectOptions.length === 0;

    if (isDisabled) {
      return (
        <FormGroup label="Git Branch">
          <TextInput
            aria-label="Git Branch"
            placeholder="Enter the branch of the Git Repository"
            onChange={(_event, value) => this.handleChange(value)}
            value={gitBranch || ''}
          />
        </FormGroup>
      );
    }

    return (
      <FormGroup label="Git Branch">
        <Select
          isOpen={isOpen}
          selected={gitBranch}
          onSelect={(_event, value) => this.onClick(value as string)}
          onOpenChange={isOpen => this.setState({ isOpen })}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => this.setState({ isOpen: !isOpen })}
              isExpanded={isOpen}
            >
              {gitBranch || 'Select the branch of the Git Repository'}
            </MenuToggle>
          )}
        >
          <TextInputGroup>
            <TextInputGroupMain
              icon={<SearchIcon />}
              value={filterValue}
              onChange={(_event, value) => this.setState({ filterValue: value })}
              placeholder="Filter branches"
            />
            {filterValue && (
              <TextInputGroupUtilities>
                <button
                  type="button"
                  aria-label="Clear filter"
                  onClick={() => this.setState({ filterValue: '' })}
                >
                  ×
                </button>
              </TextInputGroupUtilities>
            )}
          </TextInputGroup>
          <SelectList>
            {selectOptions && selectOptions.length > 0 ? (
              selectOptions
            ) : (
              <SelectOption isDisabled>No branches found</SelectOption>
            )}
          </SelectList>
        </Select>
      </FormGroup>
    );
  }
}
