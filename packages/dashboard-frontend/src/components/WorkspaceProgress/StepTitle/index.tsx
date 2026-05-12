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
import ReactDOM from 'react-dom';

import { ProgressStepTitleIcon } from '@/components/WorkspaceProgress/StepTitle/Icon';
import styles from '@/components/WorkspaceProgress/StepTitle/index.module.css';

export type Props = PropsWithChildren<{
  className?: string;
  distance: -1 | 0 | 1 | undefined;
  hasChildren?: boolean;
  isError?: boolean;
  isWarning?: boolean;
  /** When set, the live-region announcement reads "Step: {parentStepName} / {step text}".
   *  Use for condition sub-steps so screen readers hear the full context. */
  parentStepName?: string;
}>;

/** Recursively extracts plain-text content from any ReactNode. */
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (React.isValidElement(node) && node.props.children) {
    return extractText(node.props.children as React.ReactNode);
  }
  return '';
}

export class ProgressStepTitle extends React.Component<Props> {
  render(): React.ReactElement {
    const { children, className, hasChildren, distance, isError, isWarning, parentStepName } =
      this.props;

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
        {/* Live region: rendered via portal so it sits outside the wizard nav button DOM
            tree, preventing its text from leaking into the button's accessible name
            (dom-accessibility-api includes role="status" text in name computation despite
            the ARIA spec's nameFrom:author rule). The portal still announces changes to
            screen readers because live regions work document-wide regardless of DOM
            position. Content is only set when the step is active (distance === 0). */}
        {ReactDOM.createPortal(
          <span role="status" aria-live="polite" aria-atomic="true" className="pf-v6-screen-reader">
            {(() => {
              if (distance !== 0) return '';
              const stepText = extractText(children);
              if (!stepText) return '';
              return parentStepName ? `Step: ${parentStepName} / ${stepText}` : `Step: ${stepText}`;
            })()}
          </span>,
          document.body,
        )}
      </>
    );
  }
}
