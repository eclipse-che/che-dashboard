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

import { Button } from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { CheTooltip } from '@/components/CheTooltip';

export type Props = {
  text: string;
  onCopy?: () => void;
  style?: React.CSSProperties;
};

type State = {
  timerId: number | undefined;
};

export class CheCopyToClipboard extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      timerId: undefined,
    };
  }

  componentWillUnmount(): void {
    if (this.state.timerId !== undefined) {
      window.clearTimeout(this.state.timerId);
    }
  }

  private handleOnCopy(): void {
    this.props.onCopy?.();
    window.clearTimeout(this.state.timerId);
    const timerId = window.setTimeout(() => this.setState({ timerId: undefined }), 3000);
    this.setState({ timerId });
  }

  public render(): React.ReactNode {
    const { text, style } = this.props;
    const { timerId } = this.state;

    return (
      <CheTooltip content={timerId ? 'Copied!' : 'Copy to clipboard'}>
        <CopyToClipboard text={text} onCopy={() => this.handleOnCopy()}>
          <Button variant="link" icon={<CopyIcon />} name="Copy to Clipboard" style={style} />
        </CopyToClipboard>
      </CheTooltip>
    );
  }
}
