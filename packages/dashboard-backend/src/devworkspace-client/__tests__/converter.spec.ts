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

import { devfileToDevWorkspace, devWorkspaceToDevfile } from '../services/converters';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

describe('testing sample conversions', () => {

    describe('devfile to devworkspace', () => {
        test('the sample-devfile-plugins fixture should convert into sample-devworkspace fixture', () => {
            const input: any = yaml.load(fs.readFileSync(__dirname + '/fixtures/sample-devfile-plugins.yaml', 'utf-8'));
            const output = yaml.load(fs.readFileSync(__dirname + '/fixtures/sample-devworkspace.yaml', 'utf-8'));
            expect(devfileToDevWorkspace(input, 'che', true)).toStrictEqual(output);
        });
    });

    describe('devworkspace to devfile', () => {
        test('the sample-devworkspace fixture should convert into sample-devfile fixture', () => {
            const input: any = yaml.load(fs.readFileSync(__dirname + '/fixtures/sample-devworkspace.yaml', 'utf-8'));
            const output = yaml.load(fs.readFileSync(__dirname + '/fixtures/sample-devfile.yaml', 'utf-8'));
            delete (output as any).metadata.attributes;
            expect(devWorkspaceToDevfile(input)).toStrictEqual(output);
        });
    });

});
