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

import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import renderer, { ReactTestRendererJSON } from 'react-test-renderer';

import { WorkspaceStatusIndicator } from '@/components/Workspace/Status/Indicator';
import { enqueueAnnouncement } from '@/components/WorkspaceProgress/StepTitle/announceQueue';
import { BRANDING_DEFAULT } from '@/services/bootstrap/branding.constant';
import { DevWorkspaceStatus, WorkspaceStatus } from '@/services/helpers/types';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

jest.mock('@/components/WorkspaceProgress/StepTitle/announceQueue', () => ({
  enqueueAnnouncement: jest.fn(),
}));

describe('Workspace indicator component', () => {
  it('should render default status correctly', () => {
    const element = (
      <WorkspaceStatusIndicator status={WorkspaceStatus.STOPPING} containerScc={undefined} />
    );
    expect(getComponentSnapshot(element)).toMatchSnapshot();
  });

  describe('Che Workspaces', () => {
    it('should render STOPPED status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={WorkspaceStatus.STOPPED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render STARTING status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={WorkspaceStatus.STARTING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render RUNNING status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={WorkspaceStatus.RUNNING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render ERROR status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={WorkspaceStatus.ERROR} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render STOPPING status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={WorkspaceStatus.STOPPING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });
  });

  describe('DevWorkspaces', () => {
    it('should render STOPPED status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.STOPPED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render RUNNING status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.RUNNING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render FAILED status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.FAILED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });

    it('should render FAILING status correctly', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.FAILING} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });
  });

  describe('Deprecated workspaces', () => {
    it('should render "Deprecated" status correctly', () => {
      const element = <WorkspaceStatusIndicator status={'Deprecated'} containerScc={undefined} />;
      expect(getComponentSnapshot(element)).toMatchSnapshot();
    });
  });

  describe('SCC Mismatch', () => {
    it('should render warning triangle icon for STOPPED workspace when containerScc does not match currentScc', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.STOPPED} containerScc="restricted" />
      );
      expect(getComponentSnapshot(element, 'anyuid')).toMatchSnapshot();
    });

    it('should render warning for STOPPED workspace when containerScc is undefined but currentScc is defined', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.STOPPED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element, 'anyuid')).toMatchSnapshot();
    });

    it('should render normal status for RUNNING workspace even with SCC mismatch', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.RUNNING} containerScc="restricted" />
      );
      expect(getComponentSnapshot(element, 'anyuid')).toMatchSnapshot();
    });

    it('should render normal status when containerScc matches currentScc', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.STOPPED} containerScc="anyuid" />
      );
      expect(getComponentSnapshot(element, 'anyuid')).toMatchSnapshot();
    });

    it('should render normal status when currentScc is undefined (server has no SCC requirement)', () => {
      const element = (
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.STOPPED} containerScc={undefined} />
      );
      expect(getComponentSnapshot(element, undefined)).toMatchSnapshot();
    });
  });
});

describe('screen reader announcements', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not announce on initial mount', () => {
    const store = new MockStoreBuilder()
      .withBranding(BRANDING_DEFAULT)
      .withCurrentScc(undefined)
      .build();
    render(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.STARTING}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    expect(enqueueAnnouncement).not.toHaveBeenCalled();
  });

  it('announces status change with workspace name when workspaceName is provided', () => {
    const store = new MockStoreBuilder()
      .withBranding(BRANDING_DEFAULT)
      .withCurrentScc(undefined)
      .build();
    const { rerender } = render(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.STARTING}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    rerender(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.RUNNING}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    expect(enqueueAnnouncement).toHaveBeenCalledWith('Workspace my-workspace status is Running');
  });

  it('announces status change without name when workspaceName is not provided', () => {
    const store = new MockStoreBuilder()
      .withBranding(BRANDING_DEFAULT)
      .withCurrentScc(undefined)
      .build();
    const { rerender } = render(
      <Provider store={store}>
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.STARTING} containerScc={undefined} />
      </Provider>,
    );
    rerender(
      <Provider store={store}>
        <WorkspaceStatusIndicator status={DevWorkspaceStatus.RUNNING} containerScc={undefined} />
      </Provider>,
    );
    expect(enqueueAnnouncement).toHaveBeenCalledWith('Workspace status is Running');
  });

  it('announces when status transitions STOPPING → STOPPED (stop completed)', () => {
    const store = new MockStoreBuilder()
      .withBranding(BRANDING_DEFAULT)
      .withCurrentScc(undefined)
      .build();
    const { rerender } = render(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.STOPPING}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    rerender(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.STOPPED}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    expect(enqueueAnnouncement).toHaveBeenCalledWith('Workspace my-workspace status is Stopped');
  });

  it('does not announce when status is STOPPED from a non-stopping state (avoids stopped→starting noise)', () => {
    const store = new MockStoreBuilder()
      .withBranding(BRANDING_DEFAULT)
      .withCurrentScc(undefined)
      .build();
    const { rerender } = render(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.RUNNING}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    rerender(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.STOPPED}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    expect(enqueueAnnouncement).not.toHaveBeenCalled();
  });

  it('announces workspace removed when unmounting in TERMINATING state', () => {
    const store = new MockStoreBuilder()
      .withBranding(BRANDING_DEFAULT)
      .withCurrentScc(undefined)
      .build();
    const { unmount } = render(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.TERMINATING}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    unmount();
    expect(enqueueAnnouncement).toHaveBeenCalledWith('Workspace my-workspace removed');
  });

  it('does not announce removed when unmounting in non-TERMINATING state', () => {
    const store = new MockStoreBuilder()
      .withBranding(BRANDING_DEFAULT)
      .withCurrentScc(undefined)
      .build();
    const { unmount } = render(
      <Provider store={store}>
        <WorkspaceStatusIndicator
          status={DevWorkspaceStatus.STOPPED}
          containerScc={undefined}
          workspaceName="my-workspace"
        />
      </Provider>,
    );
    unmount();
    expect(enqueueAnnouncement).not.toHaveBeenCalled();
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
