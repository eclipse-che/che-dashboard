/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Button, FormGroup, InputGroupText, TextInput, ValidatedOptions } from '@patternfly/react-core';
import { ExclamationCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import React from 'react';

const MAX_LENGTH = 256;
const PATTERN = '^http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+$';
const ERROR_REQUIRED_VALUE = 'A value is required.';
const ERROR_MAX_LENGTH = `The url is too long. The maximum length is ${MAX_LENGTH} characters.`;
const ERROR_PATTERN_MISMATCH = 'The URL is not valid.';

type Props = {
  url: string;
  onChange?: (url: string, validated: ValidatedOptions) => void;
};

type State = {
  errorMessage?: string;
  url: string;
  validated: ValidatedOptions;
};

export class RegistryUrlFormGroup extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    const url = this.props.url;
    const validated = ValidatedOptions.default;

    this.state = { url, validated };
  }

  public componentDidUpdate(prevProps: Props): void {
    const { url } = this.props;
    if (prevProps.url !== url) {
      this.setState({ url });
    }
  }

  private onChange(url: string): void {
    if (this.state.url === url) {
      return;
    }
    const { onChange } = this.props;
    const { errorMessage, validated } = this.validate(url);

    this.setState({ url, validated, errorMessage });
    if (onChange) {
      onChange(url, validated);
    }
  }

  private validate(url: string): { validated: ValidatedOptions; errorMessage?: string; } {
    if (url.length === 0) {
      return {
        errorMessage: ERROR_REQUIRED_VALUE,
        validated: ValidatedOptions.error,
      };
    } else if (url.length > MAX_LENGTH) {
      return {
        errorMessage: ERROR_MAX_LENGTH,
        validated: ValidatedOptions.error,
      };
    }
    if (!new RegExp(PATTERN).test(url)) {
      return {
        errorMessage: ERROR_PATTERN_MISMATCH,
        validated: ValidatedOptions.error,
      };
    }

    return {
      errorMessage: undefined,
      validated: ValidatedOptions.success,
    };
  }

  public render(): React.ReactElement {
    const { url, errorMessage, validated } = this.state;

    return (
      <FormGroup
        style={{ gridTemplateColumns: '80px', minHeight: '65px' }}
        label="Registry"
        fieldId="id-registry-helper"
        helperTextInvalid={errorMessage}
        isRequired={true}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
        validated={validated}
      >
        <InputGroupText>
          <TextInput
            aria-label="Url input"
            placeholder="Enter a registry"
            type="url"
            value={url}
            validated={validated}
            onChange={_url => this.onChange(_url)}
          />
          <Button
            variant="link"
            isDisabled={!url || validated === ValidatedOptions.error}
            aria-label="open registry">
            <a
              href={url}
              style={{ color: 'inherit' }}
              target="_blank"
              rel="noreferrer">
              <ExternalLinkAltIcon />
            </a>
          </Button>
        </InputGroupText>
      </FormGroup>
    );
  }

}
