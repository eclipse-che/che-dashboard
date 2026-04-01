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

import { WorkspaceActionsConsumer } from '@/contexts/WorkspaceActions';
import { WorkspaceActionsDropdown } from '@/contexts/WorkspaceActions/Dropdown';
import { NavigationRecentItemObject } from '@/Layout/Navigation';

/**
 * Custom DOM event name used to coordinate "close all other dropdowns" behaviour.
 * When one RecentItemWorkspaceActions opens its dropdown it dispatches this event
 * with the workspace UID as detail.  Every other instance listens and closes itself.
 */
const EVENT_DROPDOWN_OPENED = 'recent-item-workspace-actions:opened';

type Props = {
  item: NavigationRecentItemObject;
  /** True while the parent nav-item is hovered or focused; controls whether the actions are visible. */
  isParentHovered: boolean;
  /** True while the parent nav-item or any of its descendants has keyboard focus. */
  isParentFocused: boolean;
};

export function RecentItemWorkspaceActions(props: Props): React.ReactElement {
  const { item, isParentHovered, isParentFocused } = props;
  const [isOpen, setIsOpen] = React.useState(false);

  // When this dropdown opens, broadcast so siblings can close themselves.
  const handleToggle = React.useCallback(
    (open: boolean) => {
      if (open) {
        document.dispatchEvent(
          new CustomEvent<{ uid: string }>(EVENT_DROPDOWN_OPENED, {
            detail: { uid: item.workspace.uid },
          }),
        );
      }
      setIsOpen(open);
    },
    [item.workspace.uid],
  );

  // Listen for another dropdown opening and close this one if it isn't ours.
  React.useEffect(() => {
    const onOtherOpened = (e: Event) => {
      const { uid } = (e as CustomEvent<{ uid: string }>).detail;
      if (uid !== item.workspace.uid) {
        setIsOpen(false);
      }
    };
    document.addEventListener(EVENT_DROPDOWN_OPENED, onOtherOpened);
    return () => {
      document.removeEventListener(EVENT_DROPDOWN_OPENED, onOtherOpened);
    };
  }, [item.workspace.uid]);

  const isVisible = isParentHovered || isParentFocused || isOpen;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        visibility: isVisible ? 'visible' : 'hidden',
      }}
      onClick={e => {
        e.stopPropagation();
      }}
    >
      <WorkspaceActionsConsumer>
        {context => (
          <WorkspaceActionsDropdown
            context={context}
            toggle="kebab-toggle"
            workspace={item.workspace}
            isExpanded={isOpen}
            onToggle={handleToggle}
          />
        )}
      </WorkspaceActionsConsumer>
    </div>
  );
}
