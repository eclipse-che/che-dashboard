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

const mockEnqueueAnnouncement = jest.fn();
jest.mock('@/components/WorkspaceProgress/StepTitle/announceQueue', () => ({
  enqueueAnnouncement: mockEnqueueAnnouncement,
}));

import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';

import { ProgressStepTitle } from '..';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('ProgressStepTitle', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('snapshot - non-active step', () => {
    const snapshot = createSnapshot(-1, {});
    expect(snapshot).toMatchSnapshot();
  });

  test('snapshot - active step', () => {
    const snapshot = createSnapshot(0, {});
    expect(snapshot).toMatchSnapshot();
  });

  test('snapshot - active step failed', () => {
    const snapshot = createSnapshot(0, { isError: true });
    expect(snapshot).toMatchSnapshot();
  });

  test('snapshot - active step warning', () => {
    const snapshot = createSnapshot(0, { isWarning: true });
    expect(snapshot).toMatchSnapshot();
  });

  test('snapshot - active step has children', () => {
    const snapshot = createSnapshot(0, { hasChildren: true });
    expect(snapshot).toMatchSnapshot();
  });

  test('snapshot - already-done step', () => {
    const snapshot = createSnapshot(1, {});
    expect(snapshot).toMatchSnapshot();
  });

  describe('screen-reader announcements', () => {
    it('does not queue announcement for a not-yet-started step (distance=-1)', () => {
      renderComponent(-1, {});
      expect(mockEnqueueAnnouncement).not.toHaveBeenCalled();
    });

    it('does not queue announcement when top-level step mounts as active (distance=0) — handled by WorkspaceProgress', () => {
      renderComponent(0, {});
      expect(mockEnqueueAnnouncement).not.toHaveBeenCalled();
    });

    it('does not queue announcement when top-level step mounts already done (distance=1) — handled by WorkspaceProgress', () => {
      renderComponent(1, {});
      expect(mockEnqueueAnnouncement).not.toHaveBeenCalled();
    });

    it('does not queue announcement for top-level step (no parentStepName) on distance→0 — handled by WorkspaceProgress', () => {
      const { reRenderComponent } = renderComponent(-1, {});
      reRenderComponent(0, {});
      expect(mockEnqueueAnnouncement).not.toHaveBeenCalled();
    });

    it('does not queue announcement for top-level step (no parentStepName) on completion — handled by WorkspaceProgress', () => {
      const { reRenderComponent } = renderComponent(0, {});
      reRenderComponent(1, {});
      expect(mockEnqueueAnnouncement).not.toHaveBeenCalled();
    });

    it('queues announcement on mount for condition sub-step active (distance=0, parentStepName set)', () => {
      renderComponent(0, { parentStepName: 'Waiting for workspace to start' });
      expect(mockEnqueueAnnouncement).toHaveBeenCalledTimes(1);
      expect(mockEnqueueAnnouncement).toHaveBeenCalledWith(
        'Step: Waiting for workspace to start / Step 1',
      );
    });

    it('queues announcement on mount for condition sub-step already done (distance=1, parentStepName set)', () => {
      renderComponent(1, { parentStepName: 'Waiting for workspace to start' });
      expect(mockEnqueueAnnouncement).toHaveBeenCalledTimes(1);
      expect(mockEnqueueAnnouncement).toHaveBeenCalledWith(
        'Step: Waiting for workspace to start / Step 1',
      );
    });

    it('does not re-queue when already-active step re-renders without distance change', () => {
      const { reRenderComponent } = renderComponent(0, {});
      expect(mockEnqueueAnnouncement).not.toHaveBeenCalled();

      reRenderComponent(0, {});
      expect(mockEnqueueAnnouncement).not.toHaveBeenCalled();
    });

    it('includes parent step name in the queued announcement for a sub-step (on transition)', () => {
      const { reRenderComponent } = renderComponent(-1, {
        parentStepName: 'Waiting for workspace to start',
      });
      reRenderComponent(0, { parentStepName: 'Waiting for workspace to start' });
      expect(mockEnqueueAnnouncement).toHaveBeenCalledTimes(1);
      expect(mockEnqueueAnnouncement).toHaveBeenCalledWith(
        'Step: Waiting for workspace to start / Step 1',
      );
    });

    it('queues each sub-step on mount and again on completion (4 total for 2 sub-steps)', () => {
      const { reRenderComponent: reRender1 } = renderComponent(0, {
        parentStepName: 'Waiting for workspace to start',
      });
      reRender1(1, { parentStepName: 'Waiting for workspace to start' });
      const { reRenderComponent: reRender2 } = renderComponent(0, {
        parentStepName: 'Waiting for workspace to start',
      });
      reRender2(1, { parentStepName: 'Waiting for workspace to start' });
      // Each sub-step announces twice: once on mount (distance=0) and once on completion (0→1).
      expect(mockEnqueueAnnouncement).toHaveBeenCalledTimes(4);
    });
  });
});

function getComponent(
  distance: -1 | 0 | 1 | undefined,
  {
    hasChildren = false,
    isError = false,
    isWarning = false,
    parentStepName,
  }: { isError?: boolean; isWarning?: boolean; hasChildren?: boolean; parentStepName?: string },
) {
  return (
    <ProgressStepTitle
      distance={distance}
      hasChildren={hasChildren}
      isError={isError}
      isWarning={isWarning}
      parentStepName={parentStepName}
    >
      Step 1
    </ProgressStepTitle>
  );
}
