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
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/Layout/RecentList/index.module.css';
import { buildSandboxActionItems } from '@/services/sandboxActions';
import { Sandbox, SandboxAction } from '@/services/types';

export type Props = {
  sandbox: Sandbox;
  /** True while another action is already running against the namespace. */
  isDisabled: boolean;
  onRunAction: (name: string, action: SandboxAction) => void;
  onDelete: (name: string) => void;
};

/**
 * The kebab of a recent sandbox, offering the same actions as the row of the
 * sandbox list.
 *
 * The menu is hidden until the entry is hovered or focused, as in the
 * dashboard's recent workspaces, and stays visible while it is open so it does
 * not disappear from under the pointer on the way to an item.
 */
export function RecentSandboxActions({
  sandbox,
  isDisabled,
  onRunAction,
  onDelete,
}: Props): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

  const name = sandbox.metadata.name;
  const items = buildSandboxActionItems({
    sandbox,
    isDisabled,
    onRunAction,
    onDelete,
  });

  return (
    // The entry as a whole opens the sandbox, so a click meant for the menu
    // must not reach it.
    <div
      className={`${styles.actions} ${isOpen ? styles.expanded : ''}`}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
      role="presentation"
    >
      <Dropdown
        isOpen={isOpen}
        onOpenChange={open => setIsOpen(open)}
        onSelect={() => setIsOpen(false)}
        popperProps={{ position: 'right' }}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            isExpanded={isOpen}
            aria-label={`Actions for sandbox ${name}`}
            data-testid={`recent-actions-${name}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>
          {items.map(item =>
            item.kind === 'separator' ? (
              <Divider key={item.key} component="li" />
            ) : (
              <DropdownItem
                key={item.key}
                isDisabled={item.isDisabled}
                isDanger={item.isDanger}
                data-testid={`recent-action-${item.key}`}
                onClick={item.onSelect}
              >
                {item.title}
              </DropdownItem>
            ),
          )}
        </DropdownList>
      </Dropdown>
    </div>
  );
}
