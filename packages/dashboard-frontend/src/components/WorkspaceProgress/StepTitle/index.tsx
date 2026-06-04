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

import { enqueueAnnouncement } from '@/components/WorkspaceProgress/StepTitle/announceQueue';
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
  if (node == null || typeof node === 'boolean') {
    return '';
  }
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
  private buildAnnouncementText(): string {
    const { children, parentStepName } = this.props;
    const stepText = extractText(children);
    if (!stepText) return '';
    return parentStepName ? `Step: ${parentStepName} / ${stepText}` : `Step: ${stepText}`;
  }

  private announce(): void {
    const text = this.buildAnnouncementText();
    if (text) {
      enqueueAnnouncement(text);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    // Top-level steps are announced centrally by WorkspaceProgress on activeStepId change.
    // Only condition sub-steps (those with parentStepName) announce here to avoid duplicates.
    if (!this.props.parentStepName) {
      return;
    }
    if (prevProps.distance !== 0 && this.props.distance === 0) {
      this.announce();
    }
    if (prevProps.distance === 0 && this.props.distance === 1) {
      this.announce();
    }
  }

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
      </>
    );
  }
}
