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

/**
 * Creates a new object where it takes the first (target) object
 * and fills it with fields from the second object(source).
 * Note: it does not merge nested objects, maps or arrays but
 * just overrides them. You will need to use it on nested level
 * where merging is needed. Like:
 *    target = {"map": {"target": "value", ...}}
 *    source = {"map": {"source": "value", ...}}
 *    newObject.map = createObject(target.map, source.map);
 *
 * @param target an object that is usually a store state, e.g workspaces, plugins.
 * @param source a slice of a target object
 * @param freeze if set to True, the output object will be frozen
 */
export function createObject<T>(target: T, source: Partial<T>, freeze?: boolean): T {
  const obj = Object.assign({}, target, source);
  if (freeze) {
    deepFreeze(obj);
  }
  return obj;
}

function deepFreeze(val: {[key: string]: any}) {
  Object.keys(val).forEach((property: string) => {
    if (typeof(val[property]) === 'object' && !Object.isFrozen(val[property])) {
      deepFreeze(val[property]);
    }
  });
  return Object.freeze(val);
}

export function cloneObject<T>(obj: T): T {
  if (typeof obj === 'object') {
    return JSON.parse(JSON.stringify(obj));
  }
  return obj;
}
