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

import { EmptyState, EmptyStateBody, EmptyStateVariant, PageSection } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import React from 'react';

import { ManifestTools } from '@/components/ManifestTools';
import { ManifestViewer } from '@/components/ManifestViewer';
import { useToggleBars } from '@/contexts/ToggleBars';
import styles from '@/pages/SandboxDetails/ManifestTab/index.module.css';
import { getSandboxOriginalManifest } from '@/services/sandbox';
import { Sandbox } from '@/services/types';

export type Props = {
  sandbox: Sandbox;
};

/**
 * The manifest the sandbox was created from, as the user saw it - the sample
 * YAML as published, or what the wizard previewed.
 *
 * Same pattern as the Devfile tab of a workspace: the live object the API
 * server returns is defaulted, annotated and reconciled past recognition, so
 * what is shown is the manifest kept on the object at creation. Read-only: a
 * sandbox is changed through the lifecycle actions, not by editing YAML here.
 */
export function ManifestTab({ sandbox }: Props): React.ReactElement {
  const manifest = getSandboxOriginalManifest(sandbox) ?? '';
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { hideAll, showAll } = useToggleBars();

  // Expanding gives the manifest the masthead and the sidebar as well. The
  // cleanup covers both collapsing and leaving the tab while it is expanded.
  React.useEffect(() => {
    if (!isExpanded) {
      return;
    }
    hideAll();
    return () => showAll();
  }, [isExpanded, hideAll, showAll]);

  if (manifest === '') {
    return (
      <PageSection data-testid="manifest-tab">
        <EmptyState
          variant={EmptyStateVariant.sm}
          icon={CogIcon}
          titleText="Manifest content is not available"
        >
          <EmptyStateBody>
            This sandbox was created before its manifest was kept, or outside the dashboard.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection
      data-testid="manifest-tab"
      className={isExpanded ? styles.manifestTabExpanded : undefined}
    >
      <ManifestTools
        contentText={manifest}
        fileName={`${sandbox.metadata.name}.sandbox.yaml`}
        isExpanded={isExpanded}
        onExpand={setIsExpanded}
      />
      <ManifestViewer id="sandbox-manifest-viewer" value={manifest} isExpanded={isExpanded} />
    </PageSection>
  );
}
