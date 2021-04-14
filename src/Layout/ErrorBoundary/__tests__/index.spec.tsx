/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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
import renderer from 'react-test-renderer';
import { ErrorBoundary } from '..';

class GoodComponent extends React.Component {
  render() {
    return <span>component</span>;
  }
}
class BadComponent extends React.Component {
  render() {
    throw new Error('Uncaught exception');
    return <span>component</span>;
  }
}

function wrapComponent(componentToWrap: React.ReactNode) {
  return (<ErrorBoundary>{componentToWrap}</ErrorBoundary>);
}

describe('Error boundary', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render a correctly working component', () => {
    const goodComponent = <GoodComponent />;
    const errorBoundary = wrapComponent(goodComponent);
    expect(renderer.create(errorBoundary).toJSON()).toMatchSnapshot();
  });

  it('should catch an error thrown inside a component', () => {
    // mute the outputs
    console.error = jest.fn();

    const badComponent = <BadComponent />;
    const errorBoundary = wrapComponent(badComponent);
    expect(renderer.create(errorBoundary).toJSON()).toMatchSnapshot();
  });

});
