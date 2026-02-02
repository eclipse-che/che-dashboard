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
  Button,
  ButtonVariant,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { CodeIcon, ListIcon, PlusCircleIcon } from '@patternfly/react-icons';
import React from 'react';

export type Props = {
  mode: 'form' | 'viewer';
  onAdd: () => void;
  onChangeMode: (mode: 'form' | 'viewer') => void;
};

export class GitConfigToolbar extends React.PureComponent<Props> {
  private handleModeChange(mode: 'form' | 'viewer'): void {
    this.setState({ mode });
    this.props.onChangeMode(mode);
  }

  public render(): React.ReactElement {
    const { mode } = this.props;

    return (
      <Toolbar style={{ paddingBottom: 0 }}>
        <ToolbarContent>
          <ToolbarItem align={{ default: 'alignEnd' }}>
            {mode === 'form' ? (
              <Button
                variant={ButtonVariant.link}
                icon={<CodeIcon />}
                iconPosition="left"
                onClick={() => this.handleModeChange('viewer')}
              >
                Switch to Viewer
              </Button>
            ) : (
              <Button
                variant={ButtonVariant.link}
                icon={<ListIcon />}
                iconPosition="left"
                onClick={() => this.handleModeChange('form')}
              >
                Switch to Form
              </Button>
            )}
            <Button
              variant={ButtonVariant.link}
              icon={<PlusCircleIcon />}
              iconPosition="left"
              onClick={() => this.props.onAdd()}
            >
              Import Git Configuration
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
    );
  }
}
