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

import { Props, TagLabel } from '@/components/TagLabel';
import getComponentRenderer, { screen } from '@/services/__mocks__/getComponentRenderer';

const { createSnapshot, renderComponent } = getComponentRenderer(getComponent);

describe('TagLabel component', () => {
  test('snapshot type version', () => {
    const snapshot = createSnapshot({ text: 'latest', type: 'version' });

    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot type tag', () => {
    const snapshot = createSnapshot({ text: 'Tech Preview', type: 'tag' });
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot type placeholder', () => {
    const snapshot = createSnapshot({ text: 'none', type: 'placeholder' });
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('snapshot type default', () => {
    const snapshot = createSnapshot({ text: 'default', type: 'default' });
    expect(snapshot.toJSON()).toMatchSnapshot();
  });

  test('the default label is a compact filled badge', () => {
    renderComponent({ text: 'default', type: 'default' });

    const label = screen.getByText('default').closest('.pf-v6-c-label');
    expect(label).toHaveClass('pf-m-compact');
    expect(label).not.toHaveClass('pf-m-outline');
  });

  test('a tag label is an outlined badge', () => {
    renderComponent({ text: 'Tech Preview', type: 'tag' });

    const label = screen.getByText('Tech Preview').closest('.pf-v6-c-label');
    expect(label).toHaveClass('pf-m-outline');
  });
});

function getComponent(props: Props) {
  return <TagLabel text={props.text} type={props.type} />;
}
