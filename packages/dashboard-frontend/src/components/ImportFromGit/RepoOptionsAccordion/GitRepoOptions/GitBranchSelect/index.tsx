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
  Select,
  SelectOption,
  SelectVariant,
  ValidatedOptions,
} from '@patternfly/react-core';
import React from 'react';

import styles from '@/components/ImportFromGit/RepoOptionsAccordion/GitRepoOptions/GitBranchSelect/index.module.css';

export type Props = {
  onChange: (definition: string | undefined) => void;
  gitBranch: string | undefined;
  branchList: string[] | undefined;
};
export type State = {
  isOpen: boolean;
  gitBranch: string | undefined;
};

export class GitBranchSelect extends React.PureComponent<Props, State> {
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

  private buildSelectOptions(): React.ReactElement[] | undefined {
    const branchList = this.props.branchList;
    if (branchList) {
      return branchList.map(branch => {
        return <SelectOption key={branch} id={branch} value={branch} />;
      });
    }
  }

  public render() {
    const { isOpen, gitBranch } = this.state;
    const selectOptions = this.buildSelectOptions();
    const isDisabled = selectOptions === undefined || selectOptions.length === 0;

    return (
      <FormGroup
        label="Git Branch"
        validated={!isDisabled ? ValidatedOptions.default : ValidatedOptions.error}
        helperText={!gitBranch ? 'Select the branch of the Git Repository' : undefined}
        helperTextInvalid={'No branch found. The Git repository is not available at the given URL.'}
      >
        <Select
          isDisabled={isDisabled}
          className={styles.selector}
          variant={SelectVariant.single}
          hasInlineFilter={true}
          onToggle={isOpen => this.setState({ isOpen })}
          isOpen={isOpen}
          onSelect={(_, value) => this.onClick(value.toString())}
          placeholderText={gitBranch ? gitBranch : ' '}
        >
          {selectOptions}
        </Select>
      </FormGroup>
    );
  }
}
