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
  const handleToggle = (checked: boolean) => {
    if (checked) {
      // Navigate to the new UI (PatternFly 6)
      const hash = window.location.hash;
      window.location.href = `${window.location.origin}/dashboard/v6/${hash}`;
    }
  };

  return (
    <div className={styles.uiToggle}>
      <Tooltip content="Switch to New UI (PatternFly 6 styling)">
        <Switch
          id="ui-theme-toggle"
          label="Current UI"
          isChecked={false}
          onChange={handleToggle}
          aria-label="Toggle UI theme"
          className={styles.switch}
        />
      </Tooltip>
    </div>
  );
};

export default UIToggle;
