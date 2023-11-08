/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Tooltip, TooltipPosition } from '@patternfly/react-core';
import React from 'react';

type Props = {
  children: React.ReactElement;
  content: React.ReactNode;
  position?: TooltipPosition;
};

class CheTooltip extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const { content, position, children } = this.props;

    return (
      <Tooltip
        exitDelay={3000}
        isContentLeftAligned={true}
        position={position ? position : TooltipPosition.right}
        content={content}
        style={{ border: '1px solid', borderRadius: '3px', opacity: '0.9' }}
      >
        {children}
      </Tooltip>
    );
  }
}

export default CheTooltip;
