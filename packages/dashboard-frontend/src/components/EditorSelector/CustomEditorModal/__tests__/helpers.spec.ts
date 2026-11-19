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
  isValidEditorName,
  MAX_EDITOR_NAME_LENGTH,
  parseEditorDefinition,
} from '@/components/EditorSelector/CustomEditorModal/helpers';

describe('CustomEditorModal helpers', () => {
  describe('isValidEditorName', () => {
    it.each(['che-code', 'che-code.insiders', 'editor1', 'a'])('should accept %s', name => {
      expect(isValidEditorName(name)).toBe(true);
    });

    it.each([
      ['an empty name', ''],
      ['an upper case letter', 'Che-Code'],
      ['a leading dash', '-che-code'],
      ['a trailing dash', 'che-code-'],
      ['a leading dot', '.che-code'],
      ['an underscore', 'che_code'],
      ['a space', 'che code'],
      ['a slash', 'che-incubator/che-code'],
    ])('should reject %s', (_label, name) => {
      expect(isValidEditorName(name)).toBe(false);
    });

    it('should reject a name longer than the limit', () => {
      expect(isValidEditorName('a'.repeat(MAX_EDITOR_NAME_LENGTH))).toBe(true);
      expect(isValidEditorName('a'.repeat(MAX_EDITOR_NAME_LENGTH + 1))).toBe(false);
    });
  });

  describe('parseEditorDefinition', () => {
    it('should accept an editor devfile and read its name', () => {
      expect(parseEditorDefinition('schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n')).toEqual({
        isValid: true,
        name: 'che-code',
      });
    });

    it('should accept a reference with overrides, which has no name yet', () => {
      expect(
        parseEditorDefinition(
          'reference: https://example.com/devfile.yaml\noverride:\n  containers:\n    - name: injector\n',
        ),
      ).toEqual({ isValid: true, name: undefined });
    });

    it.each([['id'], ['inline']])('should accept a che-editor.yaml with %s', key => {
      expect(parseEditorDefinition(`${key}: che-incubator/che-code/latest\n`).isValid).toBe(true);
    });

    it('should reject a YAML document that is neither a devfile nor a reference', () => {
      expect(parseEditorDefinition('foo: bar\n')).toEqual({ isValid: false, name: undefined });
    });

    it('should reject a plain string', () => {
      expect(parseEditorDefinition('just a string').isValid).toBe(false);
    });

    it('should reject broken yaml', () => {
      expect(parseEditorDefinition('metadata:\n  name: [unclosed\n').isValid).toBe(false);
    });

    it('should reject an empty definition', () => {
      expect(parseEditorDefinition('   ')).toEqual({ isValid: false, name: undefined });
    });

    it('should return no name when metadata has none', () => {
      expect(
        parseEditorDefinition('schemaVersion: 2.2.2\nmetadata:\n  displayName: VS Code\n').name,
      ).toBeUndefined();
    });

    it('should return no name when metadata is not an object', () => {
      expect(
        parseEditorDefinition('schemaVersion: 2.2.2\nmetadata: che-code\n').name,
      ).toBeUndefined();
    });
  });
});
