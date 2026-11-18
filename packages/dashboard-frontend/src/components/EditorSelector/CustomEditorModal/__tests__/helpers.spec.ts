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
  getEditorDefinitionName,
  isValidEditorDefinition,
  isValidEditorName,
  MAX_EDITOR_NAME_LENGTH,
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

  describe('isValidEditorDefinition', () => {
    it('should accept an editor devfile', () => {
      expect(isValidEditorDefinition('schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n')).toBe(
        true,
      );
    });

    it('should accept a reference with overrides', () => {
      expect(
        isValidEditorDefinition(
          'reference: https://example.com/devfile.yaml\noverride:\n  containers:\n    - name: injector\n',
        ),
      ).toBe(true);
    });

    it('should reject a plain string', () => {
      expect(isValidEditorDefinition('just a string')).toBe(false);
    });

    it('should reject broken yaml', () => {
      expect(isValidEditorDefinition('metadata:\n  name: [unclosed\n')).toBe(false);
    });

    it('should reject an empty definition', () => {
      expect(isValidEditorDefinition('   ')).toBe(false);
    });
  });

  describe('getEditorDefinitionName', () => {
    it('should return metadata.name of an editor devfile', () => {
      expect(
        getEditorDefinitionName('schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n'),
      ).toEqual('che-code');
    });

    it('should return undefined for a reference', () => {
      expect(
        getEditorDefinitionName('reference: https://example.com/devfile.yaml\n'),
      ).toBeUndefined();
    });

    it('should return undefined when metadata has no name', () => {
      expect(getEditorDefinitionName('metadata:\n  displayName: VS Code\n')).toBeUndefined();
    });

    it('should return undefined when metadata is not an object', () => {
      expect(getEditorDefinitionName('metadata: che-code\n')).toBeUndefined();
    });

    it('should return undefined for an invalid definition', () => {
      expect(getEditorDefinitionName('just a string')).toBeUndefined();
    });
  });
});
