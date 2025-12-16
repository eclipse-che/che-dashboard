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

import { ApplicationId, ApplicationInfo } from '@eclipse-che/common';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { buildPVCErrorMessage } from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/buildPVCErrorMessage';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

describe('buildPVCErrorMessage', () => {
  let workspace: Workspace;
  const applications: ApplicationInfo[] = [];

  beforeEach(() => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withName('my-workspace')
      .withNamespace('user-che')
      .build();
    workspace = constructWorkspace(devWorkspace);
    applications.length = 0;
  });

  it('should return simple message when workspace is undefined', () => {
    const message = buildPVCErrorMessage(undefined, applications);
    expect(message).toBe('PVC is full, workspace will fail to start.');
  });

  it('should include workspace name in error message', () => {
    const message = buildPVCErrorMessage(workspace, applications);
    render(<>{message}</>);
    expect(screen.getByText(/my-workspace/)).toBeInTheDocument();
  });

  it('should not include OpenShift Console link when cluster console is not available', () => {
    const message = buildPVCErrorMessage(workspace, applications);
    render(<>{message}</>);
    expect(screen.queryByText(/OpenShift Console/)).not.toBeInTheDocument();
  });

  it('should include OpenShift Console link when cluster console is available', () => {
    applications.push({
      id: ApplicationId.CLUSTER_CONSOLE,
      url: 'https://console-openshift-console.apps.example.com',
      title: 'OpenShift Console',
      icon: '',
    });
    const message = buildPVCErrorMessage(workspace, applications);
    render(<>{message}</>);

    const link = screen.getByRole('link', { name: /OpenShift Console/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://console-openshift-console.apps.example.com/k8s/ns/user-che/core~v1~PersistentVolumeClaim',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should include instructions to expand PVC size', () => {
    const message = buildPVCErrorMessage(workspace, applications);
    render(<>{message}</>);

    expect(screen.getByText(/To fix this issue:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Delete old or unused workspaces to free up PVC storage space/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Manually expand PVC size by updating the YAML:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Restart the workspace once PVC definition is updated/),
    ).toBeInTheDocument();
  });

  it('should include YAML snippet for PVC expansion', () => {
    const message = buildPVCErrorMessage(workspace, applications);
    render(<>{message}</>);

    const yamlSnippet = screen.getByText(/resources:/);
    expect(yamlSnippet).toBeInTheDocument();
    expect(screen.getByText(/requests:/)).toBeInTheDocument();
    expect(screen.getByText(/storage: <new-size>/)).toBeInTheDocument();
  });

  it('should render as ordered list with three items', () => {
    const message = buildPVCErrorMessage(workspace, applications);
    const { container } = render(<>{message}</>);

    const orderedList = container.querySelector('ol');
    expect(orderedList).toBeInTheDocument();
    expect(orderedList?.children).toHaveLength(3);
  });

  it('should include suggestion to delete old workspaces', () => {
    const message = buildPVCErrorMessage(workspace, applications);
    render(<>{message}</>);

    expect(
      screen.getByText(/Delete old or unused workspaces to free up PVC storage space/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This will automatically clean up associated PVC resources and free storage/,
      ),
    ).toBeInTheDocument();
  });
});
