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

import React from 'react';

import { Props } from '@/components/AiSelector';

export default class AiSelector extends React.PureComponent<Props> {
  render() {
    const { onSelect } = this.props;
    return (
      <div data-testid="ai-selector">
        AI Selector
        <button onClick={() => onSelect(['google/gemini'])}>Select Gemini</button>
        <button onClick={() => onSelect([])}>Use No AI</button>
      </div>
    );
  }
}
