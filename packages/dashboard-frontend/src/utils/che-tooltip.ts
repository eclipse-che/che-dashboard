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

import { TooltipPosition } from '@patternfly/react-core';
import React from 'react';

jest.mock('@/components/CheTooltip', () => {
  return function CheTooltip(props: {
    children: React.ReactElement;
    content: React.ReactNode;
    position?: TooltipPosition;
  }): React.ReactElement {
    return React.createElement('div', null, props.children, props.content);
  };
});
