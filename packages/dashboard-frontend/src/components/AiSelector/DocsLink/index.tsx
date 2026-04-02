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

import { Button, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';

export type Props = {
  docsUrl?: string;
};

const DEFAULT_DOCS_URL = 'https://eclipse.dev/che/docs/stable/end-user-guide/ai-provider/';

export class AiSelectorDocsLink extends React.PureComponent<Props> {
  public render() {
    const { docsUrl } = this.props;
    const href = docsUrl || DEFAULT_DOCS_URL;
    return (
      <Flex>
        <FlexItem align={{ default: 'alignRight' }}>
          <Button component="a" href={href} variant="link" isInline target="_blank">
            Learn more about AI providers
          </Button>
        </FlexItem>
      </Flex>
    );
  }
}
