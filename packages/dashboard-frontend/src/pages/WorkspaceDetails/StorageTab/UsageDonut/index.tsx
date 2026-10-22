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

import { WorkspaceStorageUsage } from '@eclipse-che/common';
import React from 'react';

import { formatGiB } from '@/pages/WorkspaceDetails/StorageTab/helpers';
import styles from '@/pages/WorkspaceDetails/StorageTab/UsageDonut/index.module.css';

export type UsageState = 'loading' | 'loaded' | 'stopped' | 'unavailable';

export type Props = {
  status: UsageState;
  usage?: WorkspaceStorageUsage;
};

const SIZE = 180;
const STROKE_WIDTH = 18;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const WARNING_THRESHOLD = 0.75;
const DANGER_THRESHOLD = 0.9;

/**
 * Utilization donut of the workspace volume: dark = used, light = available.
 */
export class UsageDonut extends React.PureComponent<Props> {
  private getLabels(): { title: string; subtitle: string[] } {
    const { status, usage } = this.props;
    if (status === 'loaded' && usage) {
      return { title: formatGiB(usage.availableBytes), subtitle: ['Available'] };
    }
    if (status === 'stopped') {
      return { title: '—', subtitle: ['Start the', 'workspace'] };
    }
    if (status === 'loading') {
      return { title: '…', subtitle: ['Loading'] };
    }
    return { title: '—', subtitle: ['Usage', 'unavailable'] };
  }

  public render(): React.ReactElement {
    const { status, usage } = this.props;
    const ratio =
      status === 'loaded' && usage && usage.totalBytes > 0
        ? Math.min(1, usage.usedBytes / usage.totalBytes)
        : 0;
    const usedLength = ratio * CIRCUMFERENCE;

    let usedClassName = styles.used;
    if (ratio >= DANGER_THRESHOLD) {
      usedClassName += ` ${styles.usedDanger}`;
    } else if (ratio >= WARNING_THRESHOLD) {
      usedClassName += ` ${styles.usedWarning}`;
    }

    const { title, subtitle } = this.getLabels();
    const ariaLabel =
      status === 'loaded' && usage
        ? // `df` excludes reserved blocks: its total doesn't match the PVC capacity
          `${formatGiB(usage.usedBytes)} used, ${formatGiB(usage.availableBytes)} available`
        : `Storage usage: ${[title, ...subtitle].join(' ')}`;

    const center = SIZE / 2;
    return (
      <svg
        className={styles.donut}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={ariaLabel}
        data-testid="storage-usage-donut"
      >
        <circle
          className={styles.track}
          cx={center}
          cy={center}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
        />
        {usedLength > 0 && (
          <circle
            className={usedClassName}
            cx={center}
            cy={center}
            r={RADIUS}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${usedLength} ${CIRCUMFERENCE - usedLength}`}
            transform={`rotate(-90 ${center} ${center})`}
            data-testid="storage-usage-used"
          />
        )}
        <text className={styles.title} x={center} y={center - 6} textAnchor="middle">
          {title}
        </text>
        {subtitle.map((line, index) => (
          <text
            key={line}
            className={styles.subtitle}
            x={center}
            y={center + 16 + index * 16}
            textAnchor="middle"
          >
            {line}
          </text>
        ))}
      </svg>
    );
  }
}
