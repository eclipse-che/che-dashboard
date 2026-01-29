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

import { Switch, Tooltip } from '@patternfly/react-core';
import React from 'react';

import styles from '@/Layout/Header/UIToggle/index.module.css';

export const UIToggle: React.FC = () => {
  const handleToggle = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    if (!checked) {
      // Navigate to the current UI (PatternFly 5)
      const hash = window.location.hash;
      window.location.href = `${window.location.origin}/dashboard/${hash}`;
    }
  };

  return (
    <div className={styles.uiToggle}>
      <Tooltip content="Switch to Current UI (PatternFly 5 styling)">
        <Switch
          id="ui-theme-toggle"
          label="New UI"
          isChecked={true}
          onChange={handleToggle}
          aria-label="Toggle UI theme"
          className={styles.switch}
        />
      </Tooltip>
    </div>
  );
};

export default UIToggle;
