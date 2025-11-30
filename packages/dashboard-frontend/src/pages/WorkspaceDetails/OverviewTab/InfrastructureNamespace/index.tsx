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

import { Button, FormGroup } from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { CheTooltip } from '@/components/CheTooltip';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';

type Props = {
  namespace: string;
};

type State = {
  timerId: number | undefined;
};

export class InfrastructureNamespaceFormGroup extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      timerId: undefined,
    };
  }

  private handleCopyToClipboard(): void {
    let { timerId } = this.state;
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }
    timerId = window.setTimeout(() => {
      this.setState({
        timerId: undefined,
      });
    }, 3000);
    this.setState({ timerId });
  }

  public render(): React.ReactElement {
    const { timerId } = this.state;
    const { namespace } = this.props;

    return (
      <FormGroup label="Kubernetes Namespace" fieldId="infrastructure-namespace">
        <div className={overviewStyles.readonly}>{namespace}</div>
        <CheTooltip content={timerId ? 'Copied!' : 'Copy to clipboard'}>
          <CopyToClipboard text={namespace} onCopy={() => this.handleCopyToClipboard()}>
            <Button
              variant="link"
              icon={<CopyIcon />}
              name="Copy to Clipboard"
              data-testid="copy-to-clipboard"
            />
          </CopyToClipboard>
        </CheTooltip>
      </FormGroup>
    );
  }
}
