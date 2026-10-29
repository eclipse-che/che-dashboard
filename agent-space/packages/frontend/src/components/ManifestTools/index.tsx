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

import { Button, ButtonVariant, Divider, Flex, FlexItem } from '@patternfly/react-core';
import { CompressIcon, CopyIcon, DownloadIcon, ExpandIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/components/ManifestTools/index.module.css';

export type Props = {
  /** The YAML the buttons act on. */
  contentText: string;
  /** Name the download is offered under. */
  fileName: string;
  isExpanded: boolean;
  onExpand: (isExpanded: boolean) => void;
};

/** How long the Copy button keeps reporting the outcome of the last click. */
const FEEDBACK_TIMEOUT_MS = 3000;

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_LABELS: Record<CopyState, string> = {
  idle: 'Copy to clipboard',
  copied: 'Copied',
  failed: 'Press Ctrl+C to copy',
};

/**
 * The toolbar above the manifest: copy, download, and expand - the same three
 * the dashboard puts above a devfile.
 */
export function ManifestTools({
  contentText,
  fileName,
  isExpanded,
  onExpand,
}: Props): React.ReactElement {
  const [copyState, setCopyState] = React.useState<CopyState>('idle');
  const [blobUrl, setBlobUrl] = React.useState('');

  // The object URL is owned by this component: it is replaced whenever the
  // manifest changes and released on unmount, so a tab left open on a watched
  // sandbox does not accumulate blobs.
  React.useEffect(() => {
    const url = URL.createObjectURL(new Blob([contentText], { type: 'application/x-yaml' }));
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [contentText]);

  React.useEffect(() => {
    if (copyState === 'idle') {
      return;
    }
    const timer = window.setTimeout(() => setCopyState('idle'), FEEDBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopy = React.useCallback(async () => {
    // Clipboard access needs a secure context and the user's permission; when
    // it is refused the button says so instead of claiming a copy happened.
    try {
      await navigator.clipboard.writeText(contentText);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }, [contentText]);

  return (
    <div className={styles.manifestTools} data-testid="manifest-tools">
      <Flex>
        <FlexItem>
          <Button
            variant={ButtonVariant.link}
            className={styles.button}
            icon={<CopyIcon />}
            onClick={() => void handleCopy()}
            data-testid="copy-manifest-button"
          >
            {COPY_LABELS[copyState]}
          </Button>
        </FlexItem>
        <Divider orientation={{ default: 'vertical' }} />
        <FlexItem>
          <Button
            variant={ButtonVariant.link}
            component="a"
            className={styles.button}
            icon={<DownloadIcon />}
            download={fileName}
            href={blobUrl}
            data-testid="download-manifest-button"
          >
            Download
          </Button>
        </FlexItem>
        <Divider orientation={{ default: 'vertical' }} />
        <FlexItem>
          <Button
            variant={ButtonVariant.link}
            className={styles.button}
            icon={isExpanded ? <CompressIcon /> : <ExpandIcon />}
            onClick={() => onExpand(!isExpanded)}
            data-testid="expand-manifest-button"
          >
            {isExpanded ? 'Compress' : 'Expand'}
          </Button>
        </FlexItem>
      </Flex>
    </div>
  );
}
