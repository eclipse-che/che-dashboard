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

import { Button, Flex, Form, PageSection, PageSectionVariants } from '@patternfly/react-core';
import React, { FormEvent } from 'react';

import { GitConfigSectionUser } from '@/pages/UserPreferences/GitConfig/Form/SectionUser';
import { GitConfig } from '@/store/GitConfig';

export type Props = {
  isLoading: boolean;
  gitConfig: GitConfig;
  onSave: (gitConfig: GitConfig) => Promise<void>;
  onReload: () => Promise<void>;
};
export type State = {
  isValid: boolean;
  nextGitConfig: GitConfig | undefined;
};

export class GitConfigForm extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isValid: true,
      nextGitConfig: undefined,
    };
  }

  private handleSubmit(e: FormEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  private async handleSave(): Promise<void> {
    const nextGitConfig = {
      ...this.props.gitConfig,
      ...(this.state.nextGitConfig || {}),
    };
    await this.props.onSave(nextGitConfig);
  }

  private async handleReload(): Promise<void> {
    try {
      await this.props.onReload();
      this.setState({
        nextGitConfig: undefined,
        isValid: true,
      });
    } catch (e) {
      // ignore
    }
  }

  private handleChangeConfig(gitConfig: GitConfig, isValid: boolean): void {
    this.setState({
      nextGitConfig: gitConfig,
      isValid,
    });
  }

  private isGitConfigEqual(config1: GitConfig, config2: GitConfig): boolean {
    if (!config1 || !config2 || !config1.user || !config2.user) {
      return false;
    }
    return config1.user.email === config2.user.email && config1.user.name === config2.user.name;
  }

  public render(): React.ReactElement {
    const { gitConfig, isLoading } = this.props;
    const { isValid, nextGitConfig } = this.state;

    const config = { ...gitConfig, ...(nextGitConfig || {}) };
    const isSaveDisabled =
      isLoading ||
      !isValid ||
      nextGitConfig === undefined ||
      this.isGitConfigEqual(gitConfig, nextGitConfig);

    return (
      <PageSection variant={PageSectionVariants.default}>
        <Form isHorizontal onSubmit={e => this.handleSubmit(e)}>
          <GitConfigSectionUser
            isLoading={isLoading}
            config={config}
            onChange={(gitConfig, isValid) => this.handleChangeConfig(gitConfig, isValid)}
          />
          <Flex>
            <Button
              data-testid="button-save"
              isDisabled={isSaveDisabled}
              type="button"
              variant="primary"
              onClick={() => this.handleSave()}
            >
              Save
            </Button>
            <Button
              data-testid="button-reload"
              disabled={isLoading}
              isDisabled={isLoading}
              type="reset"
              variant="secondary"
              onClick={() => this.handleReload()}
            >
              Reload
            </Button>
          </Flex>
        </Form>
      </PageSection>
    );
  }
}
