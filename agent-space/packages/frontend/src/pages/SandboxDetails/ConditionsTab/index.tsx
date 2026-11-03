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

import { PageSection } from '@patternfly/react-core';
import React from 'react';

import { ConditionsTable } from '@/components/ConditionsTable';
import { Sandbox } from '@/services/types';

export type Props = {
  sandbox: Sandbox;
};

/**
 * What the controller says about the sandbox. Its own tab rather than the foot
 * of the overview: the conditions are the first thing to read when a sandbox
 * does not behave, and there can be a lot of them.
 */
export function ConditionsTab({ sandbox }: Props): React.ReactElement {
  return (
    <PageSection data-testid="conditions-tab">
      <ConditionsTable conditions={sandbox.status?.conditions ?? []} />
    </PageSection>
  );
}
