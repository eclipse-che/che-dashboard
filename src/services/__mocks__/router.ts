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

import { createLocation, createMemoryHistory, Location, LocationState } from 'history';
import { MemoryHistory } from 'history/createMemoryHistory';
import { match as routerMatch } from 'react-router';

const generateUrl = <Params extends { [K in keyof Params]?: string } = {}>(path: string, params: Params): string => {
  let resultPath = path;
  for (const param in params) {
    if (params[param]) {
      resultPath = resultPath.replace(`:${param}`, `${params[param]}`);
    }
  }
  return resultPath;
};

export const getMockRouterProps = <Params extends { [K in keyof Params]: string } = {}>(path: string, params: Params): {
  history: MemoryHistory<LocationState>;
  location: Location<LocationState>;
  match: routerMatch<Params>
} => {
  const isExact = false;
  const url = generateUrl(path, params);

  const match: routerMatch<Params> = { isExact, path, url, params };
  const history = createMemoryHistory();
  const location = createLocation(match.url);

  return { history, location, match };
};
