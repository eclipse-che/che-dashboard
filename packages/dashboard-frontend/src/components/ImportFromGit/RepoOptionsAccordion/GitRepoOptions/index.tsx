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

import { Form } from '@patternfly/react-core';
import isEqual from 'lodash/isEqual';
import React from 'react';

import { AdditionalGitRemotes } from '@/components/ImportFromGit/RepoOptionsAccordion/GitRepoOptions/AdditionalGitRemotes';
import { GitBranchSelect } from '@/components/ImportFromGit/RepoOptionsAccordion/GitRepoOptions/GitBranchSelect';
import { PathToDevfileField } from '@/components/ImportFromGit/RepoOptionsAccordion/GitRepoOptions/PathToDevfileField';
import { GitRemote } from '@/components/WorkspaceProgress/CreatingSteps/Apply/Devfile/getGitRemotes';
import { FactoryLocationAdapter } from '@/services/factory-location-adapter';

export type Props = {
  gitBranch: string | undefined;
  branchList: string[] | undefined;
  location: string;
  remotes: GitRemote[] | undefined;
  devfilePath: string | undefined;
  hasSupportedGitService: boolean;
  onChange: (
    gitBranch: string | undefined,
    remotes: GitRemote[] | undefined,
    devfilePath: string | undefined,
    isValid: boolean,
  ) => void;
};

export type State = {
  gitBranch: string | undefined;
  branchList: string[] | undefined;
  remotes: GitRemote[] | undefined;
  devfilePath: string | undefined;
  isValid: boolean;
};

export class GitRepoOptions extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      gitBranch: props.gitBranch,
      branchList: props.branchList,
      remotes: props.remotes,
      devfilePath: props.devfilePath,
      isValid: true,
    };
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    const { gitBranch, branchList, remotes, devfilePath } = this.props;

    if (gitBranch !== prevProps.gitBranch) {
      this.setState({ gitBranch });
    }

    if (branchList !== prevProps.branchList) {
      this.setState({ branchList: branchList });
    }

    if (!isEqual(remotes, prevProps.remotes)) {
      this.setState({ remotes });
    }

    if (devfilePath !== prevProps.devfilePath) {
      this.setState({ devfilePath });
    }
  }
  private handleGitBranch(gitBranch: string | undefined) {
    const { remotes, devfilePath, isValid } = this.state;

    this.setState({ gitBranch });
    this.props.onChange(gitBranch, remotes, devfilePath, isValid);
  }

  private handleRemotes(remotes: GitRemote[] | undefined, isValid: boolean) {
    const { gitBranch, devfilePath } = this.state;

    this.setState({ remotes, isValid });
    this.props.onChange(gitBranch, remotes, devfilePath, isValid);
  }

  private handleDevfilePath(devfilePath: string | undefined) {
    const { gitBranch, remotes, isValid } = this.state;

    this.setState({ devfilePath });
    this.props.onChange(gitBranch, remotes, devfilePath, isValid);
  }
  public render() {
    const { hasSupportedGitService, location } = this.props;
    const { gitBranch, branchList, remotes, devfilePath } = this.state;
    return (
      <Form isHorizontal={true} onSubmit={e => e.preventDefault()}>
        {(hasSupportedGitService || FactoryLocationAdapter.isSshLocation(location)) && (
          <GitBranchSelect
            onChange={gitBranch => this.handleGitBranch(gitBranch)}
            gitBranch={gitBranch}
            branchList={branchList}
          />
        )}
        <AdditionalGitRemotes
          onChange={(remotes: GitRemote[] | undefined, isValid: boolean) =>
            this.handleRemotes(remotes, isValid)
          }
          remotes={remotes}
        />
        <PathToDevfileField
          onChange={devfilePath => this.handleDevfilePath(devfilePath)}
          devfilePath={devfilePath}
        />
      </Form>
    );
  }
}
