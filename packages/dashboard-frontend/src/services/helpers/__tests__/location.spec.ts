/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { sanitizeLocation } from '../location';
import { Location } from 'history';

describe('location/sanitizeLocation', () => {
  it("should return the same values if location variables don't have OAuth params included", () => {
    const search = '?url=https%3A%2F%2Fgithub.com%2Ftest-samples&storageType=persistent';
    const pathname = '/f';

    const newLocation = sanitizeLocation({ search, pathname } as Location);

    expect(newLocation.search).toEqual(search);
    expect(newLocation.pathname).toEqual(pathname);
  });

  it('should return sanitized value of location.search', () => {
    const search =
      '?url=https%3A%2F%2Fgithub.com%2Ftest-samples&state=9284564475&session_state=45645654567&code=9844646765&storageType=persistent';
    const pathname = '/f';

    const newLocation = sanitizeLocation({ search, pathname } as Location);

    expect(newLocation.search).not.toEqual(search);
    expect(newLocation.search).toEqual(
      '?url=https%3A%2F%2Fgithub.com%2Ftest-samples&storageType=persistent',
    );
    expect(newLocation.pathname).toEqual(pathname);
  });

  it('should return sanitized value of location.pathname', () => {
    const search = '?url=https%3A%2F%2Fgithub.com%2Ftest-samples';
    const pathname = '/f&code=1239844646765';

    const newLocation = sanitizeLocation({ search, pathname } as Location);

    expect(newLocation.search).toEqual(search);
    expect(newLocation.pathname).not.toEqual(pathname);
    expect(newLocation.pathname).toEqual('/f');
  });
});
