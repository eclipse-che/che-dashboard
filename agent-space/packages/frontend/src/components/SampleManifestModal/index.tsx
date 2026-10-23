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

import {
  Button,
  ButtonVariant,
  EmptyState,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';
import React from 'react';

import { ErrorAlert } from '@/components/ErrorAlert';
import { ManifestViewer } from '@/components/ManifestViewer';
import { SandboxError } from '@/services/types';

export type Props = {
  isOpen: boolean;
  /** Display name of the sample, shown in the title. */
  sampleName: string;
  /** The YAML, once it has been loaded. */
  content: string | undefined;
  isLoading: boolean;
  error: SandboxError | undefined;
  onClose: () => void;
};

/**
 * Shows the manifest a sample would be created from, read-only.
 *
 * It is the copy served from the registry next to the samples index - the same
 * file the Create button applies - rather than a link to the upstream
 * repository, which may describe a different revision.
 */
export function SampleManifestModal({
  isOpen,
  sampleName,
  content,
  isLoading,
  error,
  onClose,
}: Props): React.ReactElement {
  return (
    <Modal
      aria-label="Sample manifest"
      isOpen={isOpen}
      variant={ModalVariant.large}
      onClose={onClose}
      data-testid="sample-manifest-modal"
    >
      <ModalHeader title={`${sampleName} manifest`} />
      <ModalBody>
        <ErrorAlert title="Could not load the manifest" error={error} />
        {isLoading && <EmptyState icon={Spinner} titleText="Loading the manifest" />}
        {content !== undefined && (
          <ManifestViewer id="sample-manifest-viewer" value={content} isExpanded={false} />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant={ButtonVariant.link} onClick={onClose} data-testid="close-manifest-button">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
