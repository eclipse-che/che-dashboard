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

import {
  buildPVCErrorMessage,
  PVC_FULL_FALLBACK_MESSAGE,
} from '@/components/WorkspaceProgress/StartingSteps/StartWorkspace/buildPVCErrorMessage';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

const DELETE_WORKSPACES_HINT = /Delete old or unused workspaces/;

describe('buildPVCErrorMessage', () => {
  let workspace: Workspace;
  let applications: ApplicationInfo[];

  beforeEach(() => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withName('my-workspace')
      .withNamespace('user-che')
      .build();
    workspace = constructWorkspace(devWorkspace);
    applications = [];
  });

  it('should return the plain fallback string when workspace is undefined', () => {
    expect(buildPVCErrorMessage(undefined, applications)).toBe(PVC_FULL_FALLBACK_MESSAGE);
  });

  it('should name the workspace in the message', () => {
    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    expect(screen.getByText(/my-workspace/)).toBeInTheDocument();
  });

  it('should omit the console link when no cluster console is registered', () => {
    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should omit the console link when only non-console applications are registered', () => {
    applications.push({ url: 'https://other.example.com', title: 'Other app', icon: '' });

    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should link to the namespace PVC list when a cluster console is registered', () => {
    applications.push({
      id: ApplicationId.CLUSTER_CONSOLE,
      url: 'https://console-openshift-console.apps.example.com',
      title: 'OpenShift Console',
      icon: '',
    });

    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    const link = screen.getByRole('link', { name: /OpenShift Console/ });
    expect(link).toHaveAttribute(
      'href',
      'https://console-openshift-console.apps.example.com/k8s/ns/user-che/core~v1~PersistentVolumeClaim',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should suggest deleting old workspaces for per-user storage', () => {
    workspace.storageType = 'per-user';

    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    expect(screen.getByText(DELETE_WORKSPACES_HINT)).toBeInTheDocument();
  });

  it('should omit the delete-workspaces suggestion for per-workspace storage', () => {
    workspace.storageType = 'per-workspace';

    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    expect(screen.queryByText(DELETE_WORKSPACES_HINT)).not.toBeInTheDocument();
  });

  it('should omit the delete-workspaces suggestion when the storage type is unset', () => {
    expect(workspace.storageType).toBe('');

    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    expect(screen.queryByText(DELETE_WORKSPACES_HINT)).not.toBeInTheDocument();
  });

  it('should always offer the PVC expansion snippet', () => {
    render(<>{buildPVCErrorMessage(workspace, applications)}</>);

    expect(screen.getByText(/storage:/)).toBeInTheDocument();
  });
});
