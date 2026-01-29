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
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { InfoIcon } from '@patternfly/react-icons';
import React from 'react';

export type Props = {
  onChange: (definition: string | undefined) => void;
};
export type State = {
  definition: string;
};

export class EditorDefinitionField extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      definition: '',
    };
  }

  private handleChange(_event: React.FormEvent<HTMLInputElement>, value: string) {
    value = value.trim();
    this.setState({ definition: value });
    this.props.onChange(value !== '' ? value : undefined);
  }

  public render() {
    const { definition } = this.state;

    const helperText =
      definition !== '' ? '' : 'Default editor will be used if no definition is provided.';

    return (
      <FormGroup label="Editor Definition">
        <TextInput
          aria-label="Editor Definition"
          placeholder="Enter the link to a container editor definition URL or an editor id"
          onChange={(event, value) => this.handleChange(event, value)}
          value={definition}
        />
        {helperText && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem icon={<InfoIcon />}>{helperText}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
    );
  }
}
