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

import React from 'react';
import { Provider } from 'react-redux';
import renderer, { ReactTestRendererJSON } from 'react-test-renderer';

import { WorkspaceStatusLabel } from '@/components/Workspace/Status/Label';
import { BRANDING_DEFAULT } from '@/services/bootstrap/branding.constant';
import { DevWorkspaceStatus, WorkspaceStatus } from '@/services/helpers/types';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

describe('The workspace status label component', () => {
  it('should render default status correctly', () => {
    const element = (
      <WorkspaceStatusLabel status={WorkspaceStatus.STOPPING} containerScc={undefined} />
    );
    expect(getComponentSnapshot(element)).toMatchSnapshot();
  });

  describe('Che Workspaces', () => {
    it('should render STOPPED status correctly', () => {
      const element = (
        <WorkspaceStatusLabel status={WorkspaceStatus.STOPPED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render RUNNING status correctly', () => {
      const element = (
        <WorkspaceStatusLabel status={WorkspaceStatus.RUNNING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render ERROR status correctly', () => {
      const element = (
        <WorkspaceStatusLabel status={WorkspaceStatus.ERROR} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });
  });

  describe('DevWorkspaces', () => {
    it('should render STOPPED status correctly', () => {
      const element = (
        <WorkspaceStatusLabel status={DevWorkspaceStatus.STOPPED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render RUNNING status correctly', () => {
      const element = (
        <WorkspaceStatusLabel status={DevWorkspaceStatus.RUNNING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render FAILED status correctly', () => {
      const element = (
        <WorkspaceStatusLabel status={DevWorkspaceStatus.FAILED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render FAILING status correctly', () => {
      const element = (
        <WorkspaceStatusLabel status={DevWorkspaceStatus.FAILING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });
  });

  describe('Deprecated workspaces', () => {
    it('should render "Deprecated" status correctly', () => {
      const element = <WorkspaceStatusLabel status={'Deprecated'} containerScc={undefined} />;
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });
  });

  describe('SCC Mismatch', () => {
    it('should render FAILED status when containerScc does not match currentScc', () => {
      const element = (
        <WorkspaceStatusLabel status={DevWorkspaceStatus.STOPPED} containerScc="restricted" />
      );
      expect(getComponentSnapshot(element, 'anyuid')).toMatchSnapshot();
    });

    it('should render normal status when containerScc matches currentScc', () => {
      const element = (
        <WorkspaceStatusLabel status={DevWorkspaceStatus.RUNNING} containerScc="anyuid" />
      );
      expect(getComponentSnapshot(element, 'anyuid')).toMatchSnapshot();
    });
  });
});

function getComponentSnapshot(
  component: React.ReactElement,
  currentScc: string | undefined = undefined,
): null | ReactTestRendererJSON | ReactTestRendererJSON[] {
  const store = new MockStoreBuilder()
    .withBranding(BRANDING_DEFAULT)
    .withCurrentScc(currentScc)
    .build();
  return renderer.create(<Provider store={store}>{component}</Provider>).toJSON();
}
