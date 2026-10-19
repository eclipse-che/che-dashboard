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
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { ThIcon } from '@patternfly/react-icons';
import React from 'react';

import { ApplicationInfo } from '@/services/dashboard';

const DEFAULT_GROUP = 'Applications';

export type Props = {
  applications: ApplicationInfo[];
};

function groupApplications(applications: ApplicationInfo[]): [string, ApplicationInfo[]][] {
  const byGroup = new Map<string, ApplicationInfo[]>([[DEFAULT_GROUP, []]]);

  applications.forEach(application => {
    const group = application.group || DEFAULT_GROUP;
    const items = byGroup.get(group);
    if (items === undefined) {
      byGroup.set(group, [application]);
    } else {
      items.push(application);
    }
  });

  return Array.from(byGroup.entries()).filter(([, items]) => items.length > 0);
}

/** The grid menu of the dashboard masthead, listing the cluster's own apps. */
export function ApplicationsMenu({ applications }: Props): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dropdown
      aria-label="External Applications"
      isOpen={isOpen}
      onSelect={() => setIsOpen(false)}
      onOpenChange={setIsOpen}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(current => !current)}
          isExpanded={isOpen}
          variant="plain"
          aria-label="External Applications"
          data-testid="applications-menu-toggle"
        >
          <ThIcon />
        </MenuToggle>
      )}
    >
      <DropdownList>
        {groupApplications(applications).map(([group, items]) => (
          <DropdownGroup key={group} label={group}>
            {items.map(application => (
              <DropdownItem
                key={application.url}
                icon={<img src={application.icon} alt="" />}
                to={application.url}
                target="_blank"
              >
                {application.title}
              </DropdownItem>
            ))}
          </DropdownGroup>
        ))}
      </DropdownList>
    </Dropdown>
  );
}
