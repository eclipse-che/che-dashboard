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

import React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';

function getDefaultDeleteButton(className: string): React.ReactElement {
  return (
    <span className={className}>
      <Tooltip entryDelay={200} exitDelay={200} content="Delete Workspace"><TrashIcon /></Tooltip>
    </span>
  );
}

export default getDefaultDeleteButton;
