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

import { mapMerge } from '..';

describe('Workspaces store', () => {

  it('should correctly merge environment output', () => {
    let originMap = new Map<string, string[]>();
    let additionalMap = new Map<string, string[]>([
      ['worksId1', ['test log 1.1', 'test log 1.2']],
    ]);
    let resultMap = mapMerge(originMap, additionalMap);

    expect(resultMap.has('worksId1')).toBeTruthy();
    const worksLog: string[] = resultMap.get('worksId1') || [];
    expect(worksLog.length).toEqual(2);
    expect(worksLog[0]).toEqual('test log 1.1');
    expect(worksLog[1]).toEqual('test log 1.2');

    originMap = new Map<string, string[]>([
      ['worksId1', ['test log 1.1']],
      ['worksId2', ['test log 2.1']],
    ]);
    additionalMap = new Map<string, string[]>([
      ['worksId2', ['test log 2.2']],
    ]);
    resultMap = mapMerge(originMap, additionalMap);

    expect(resultMap.has('worksId1')).toBeTruthy();
    const worksId1Log: string[] = resultMap.get('worksId1') || [];
    expect(worksId1Log.length).toEqual(1);
    expect(worksId1Log[0]).toEqual('test log 1.1');

    expect(resultMap.has('worksId2')).toBeTruthy();
    const worksId2Log: string[] = resultMap.get('worksId2') || [];
    expect(worksId2Log.length).toEqual(2);
    expect(worksId2Log[0]).toEqual('test log 2.1');
    expect(worksId2Log[1]).toEqual('test log 2.2');
  });

});
