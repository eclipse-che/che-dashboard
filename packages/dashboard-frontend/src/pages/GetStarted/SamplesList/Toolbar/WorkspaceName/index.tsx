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

import { FormGroup, TextInput, ValidatedOptions } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import isEqual from 'lodash/isEqual';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { CheTooltip } from '@/components/CheTooltip';
import styles from '@/pages/GetStarted/SamplesList/Toolbar/WorkspaceName/index.module.css';
import { RootState } from '@/store';
import { selectAllWorkspaces } from '@/store/Workspaces';

const MAX_LENGTH = 63;
const ERROR_MAX_LENGTH = 'The name is not valid.';
const ERROR_TOOLTIP_MAX_LENGTH = `The maximum length is ${MAX_LENGTH} characters.`;
const PATTERN = `^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$`;
const ERROR_PATTERN_MISMATCH = 'The name is not valid.';
const ERROR_TOOLTIP_PATTERN_MISMATCH =
  'The name is invalid. It can contain only digits, latin letters, scores, underscores. It must start and end with a letter or digit and cannot include special characters such as spaces or symbols (e.g., $, @, #, etc.).';
const ERROR_PATTERN_EXISTING_NAME = 'The name is already in use.';
const ERROR_TOOLTIP_PATTERN_EXISTING_NAME =
  'The name is already in use. Please choose another name.';

export type Props = MappedProps & {
  onChange: (name: string) => void;
  callbacks?: {
    reset?: () => void;
  };
};

export type State = {
  workspaceName: string;
  errorMessage?: string;
  errorTooltipMessage?: string;
  validated: ValidatedOptions;
  usedNames: string[];
};

class WorkspaceNameFormGroup extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      workspaceName: '',
      validated: ValidatedOptions.default,
      usedNames: [],
    };
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    const { workspaceName } = this.state;
    if (!isEqual(this.props.allWorkspaces, prevProps.allWorkspaces)) {
      const { validated, errorMessage, errorTooltipMessage } = this.validate(workspaceName);
      if (
        validated !== this.state.validated ||
        errorMessage !== this.state.errorMessage ||
        errorTooltipMessage !== this.state.errorTooltipMessage
      ) {
        this.setState({ validated, errorMessage, errorTooltipMessage });
        this.props.onChange(validated === ValidatedOptions.error ? '' : workspaceName);
      }
    }

    if (
      this.props.callbacks !== undefined &&
      this.props.callbacks.reset === undefined &&
      workspaceName.length > 0
    ) {
      this.props.callbacks.reset = () => {
        const { workspaceName, usedNames } = this.state;
        if (workspaceName.length > 0 && !usedNames.includes(workspaceName)) {
          usedNames.push(workspaceName);
        }
        this.setState({
          workspaceName: '',
          validated: ValidatedOptions.default,
          errorMessage: undefined,
          errorTooltipMessage: undefined,
          usedNames,
        });
        window.setTimeout(() => {
          const index = usedNames.indexOf(workspaceName);
          if (index > -1) {
            usedNames.splice(index, 1);
            this.setState({ usedNames });
          }
        }, 30000);
        this.handleWorkspaceNameChange('');
      };
    }
  }

  private handleWorkspaceNameChange(workspaceName: string): void {
    const { validated, errorMessage, errorTooltipMessage } = this.validate(workspaceName);
    this.setState({ workspaceName, validated, errorMessage, errorTooltipMessage });

    this.props.onChange(validated === ValidatedOptions.error ? '' : workspaceName);
  }

  private validate(name: string): {
    errorMessage: string | undefined;
    errorTooltipMessage: string | undefined;
    validated: ValidatedOptions;
  } {
    if (name.length === 0) {
      return {
        errorMessage: undefined,
        errorTooltipMessage: undefined,
        validated: ValidatedOptions.default,
      };
    } else if (name.length > MAX_LENGTH) {
      return {
        errorMessage: ERROR_MAX_LENGTH,
        errorTooltipMessage: ERROR_TOOLTIP_MAX_LENGTH,
        validated: ValidatedOptions.error,
      };
    }
    if (
      this.state.usedNames.includes(name) ||
      this.props.allWorkspaces.some(w => name === w.name || name === w.ref.metadata.name)
    ) {
      return {
        errorMessage: ERROR_PATTERN_EXISTING_NAME,
        errorTooltipMessage: ERROR_TOOLTIP_PATTERN_EXISTING_NAME,
        validated: ValidatedOptions.error,
      };
    }
    if (!new RegExp(PATTERN).test(name)) {
      return {
        errorMessage: ERROR_PATTERN_MISMATCH,
        errorTooltipMessage: ERROR_TOOLTIP_PATTERN_MISMATCH,
        validated: ValidatedOptions.error,
      };
    }

    return {
      errorMessage: undefined,
      errorTooltipMessage: undefined,
      validated: ValidatedOptions.success,
    };
  }

  private getHelperTextInvalid(): React.ReactNode {
    const { validated, errorMessage, errorTooltipMessage } = this.state;

    if (validated !== ValidatedOptions.error) {
      return undefined;
    }

    if (errorTooltipMessage) {
      return (
        <CheTooltip content={errorTooltipMessage}>
          <div className={styles.helperTextInvalid}>{errorMessage}</div>
        </CheTooltip>
      );
    }

    return <div className={styles.helperTextInvalid}>{errorMessage}</div>;
  }

  public render(): React.ReactNode {
    const { workspaceName, validated } = this.state;
    const helperTextInvalid = this.getHelperTextInvalid();

    return (
      <FormGroup
        validated={validated}
        className={styles.inputFormGroup}
        helperTextInvalid={helperTextInvalid}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
      >
        <TextInput
          type="text"
          id="wrks-name-input"
          value={workspaceName}
          validated={validated}
          maxLength={MAX_LENGTH + 1}
          placeholder="Enter a name for the sample workspace (Optional)"
          onChange={name => this.handleWorkspaceNameChange(name)}
        />
      </FormGroup>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  allWorkspaces: selectAllWorkspaces(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(WorkspaceNameFormGroup);
