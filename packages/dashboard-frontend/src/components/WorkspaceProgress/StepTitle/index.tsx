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

import React, { PropsWithChildren } from 'react';

import { ProgressStepTitleIcon } from '@/components/WorkspaceProgress/StepTitle/Icon';
import styles from '@/components/WorkspaceProgress/StepTitle/index.module.css';

export type Props = PropsWithChildren<{
  className?: string;
  distance: -1 | 0 | 1 | undefined;
  hasChildren?: boolean;
  isError?: boolean;
  isWarning?: boolean;
}>;

export class ProgressStepTitle extends React.Component<Props> {
  render(): React.ReactElement {
    const { children, className, hasChildren, distance, isError, isWarning } = this.props;

    let readiness = styles.ready;
    if (distance === 0) {
      readiness = styles.progress;
    } else if (isError) {
      readiness = styles.error;
    }

    const fullClassName = [readiness, className].filter(c => c).join(' ');

    // for step with children do not show in-progress spinner
    const dist = hasChildren && distance === 0 ? -1 : distance;

    return (
      <>
        <ProgressStepTitleIcon
          distance={dist}
          isError={isError === true}
          isWarning={isWarning === true}
        />
        <span data-testid="step-title" className={fullClassName}>
          {children}
        </span>
        {/* Live region: announces the active step to screen readers when it becomes active.
            The region is always present so screen readers register it on page load;
            content is only set when the step is active (distance === 0) so the
            announcement fires exactly once per step transition.
            The "Step: " prefix ensures the live region text differs from the visible
            step title, preventing ambiguous matches in DOM queries. */}
        <span role="status" aria-live="polite" aria-atomic="true" className="pf-v6-screen-reader">
          {distance === 0 && typeof children === 'string' ? `Step: ${children}` : ''}
        </span>
      </>
    );
  }
}
