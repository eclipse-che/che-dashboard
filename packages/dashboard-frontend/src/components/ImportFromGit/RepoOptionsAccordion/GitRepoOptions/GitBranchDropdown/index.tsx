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
  Dropdown,
  DropdownItem,
  DropdownToggle,
  FormGroup,
  ValidatedOptions,
} from '@patternfly/react-core';
import React from 'react';

import styles from '@/components/ImportFromGit/RepoOptionsAccordion/GitRepoOptions/GitBranchDropdown/index.module.css';

export type Props = {
  onChange: (definition: string | undefined) => void;
  gitBranch: string | undefined;
  branchList: string[] | undefined;
};
export type State = {
  isOpen: boolean;
  gitBranch: string | undefined;
};

export class GitBranchDropdown extends React.PureComponent<Props, State> {
  private toggleElementId = 'toggle-initial-selection';
  constructor(props: Props) {
    super(props);

    this.state = {
      gitBranch: this.props.gitBranch,
      isOpen: false,
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
    this.setState({ isOpen: false });
  }

  private buildDropdownItems(): React.ReactElement[] | undefined {
    const branchList = this.props.branchList;
    if (branchList) {
      return branchList.map(branch => {
        return (
          <DropdownItem
            key={branch}
            id={branch}
            component="button"
            onClick={() => this.onClick(branch)}
          >
            {branch}
          </DropdownItem>
        );
      });
    }
  }

  public render() {
    const dropdownItems = this.buildDropdownItems();

    return (
      <FormGroup
        label="Git Branch"
        validated={dropdownItems ? ValidatedOptions.default : ValidatedOptions.error}
        helperTextInvalid={'No branch found. Please check the Git repository URL.'}
      >
        <Dropdown
          className={styles.selector}
          onChange={value => this.handleChange(value.type)}
          value={this.state.gitBranch}
          toggle={
            <DropdownToggle
              aria-label="Git Branch"
              id={this.toggleElementId}
              onToggle={isOpen => this.setState({ isOpen })}
            >
              {this.state.gitBranch}
            </DropdownToggle>
          }
          isOpen={this.state.isOpen}
          placeholder={this.state.gitBranch}
          dropdownItems={dropdownItems}
        />
      </FormGroup>
    );
  }
}
