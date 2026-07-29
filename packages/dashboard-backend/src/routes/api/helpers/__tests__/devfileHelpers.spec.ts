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
  countProjects,
  extractDevfileDescription,
  extractDevfileName,
  generateDevfileId,
  MODIFIED_ANNOTATION_PREFIX,
  parseEntries,
} from '@/routes/api/helpers/devfile';

describe('devfile helpers', () => {
  describe('extractDevfileName', () => {
    it('should extract metadata.name', () => {
      const content = 'schemaVersion: 2.3.0\nmetadata:\n  name: my-workspace\n';
      expect(extractDevfileName(content)).toBe('my-workspace');
    });

    it('should fall back to metadata.generateName', () => {
      const content = 'schemaVersion: 2.3.0\nmetadata:\n  generateName: gen-ws-\n';
      expect(extractDevfileName(content)).toBe('gen-ws-');
    });

    it('should return "untitled" when no name or generateName', () => {
      const content = 'schemaVersion: 2.3.0\nmetadata:\n  description: test\n';
      expect(extractDevfileName(content)).toBe('untitled');
    });

    it('should return "untitled" for invalid YAML', () => {
      expect(extractDevfileName('not: valid: yaml: :::')).toBe('untitled');
    });

    it('should return "untitled" for non-object YAML', () => {
      expect(extractDevfileName('just a string')).toBe('untitled');
    });
  });

  describe('extractDevfileDescription', () => {
    it('should extract description', () => {
      const content =
        'schemaVersion: 2.3.0\nmetadata:\n  name: test\n  description: My cool workspace\n';
      expect(extractDevfileDescription(content)).toBe('My cool workspace');
    });

    it('should return empty string when no description', () => {
      const content = 'schemaVersion: 2.3.0\nmetadata:\n  name: test\n';
      expect(extractDevfileDescription(content)).toBe('');
    });
  });

  describe('generateDevfileId', () => {
    it('should generate ID with sanitized name prefix', () => {
      const content = 'schemaVersion: 2.3.0\nmetadata:\n  name: My Workspace!\n';
      const id = generateDevfileId(content);
      expect(id).toMatch(/^my-workspace-[a-f0-9]{8}$/);
    });

    it('should generate unique IDs', () => {
      const content = 'schemaVersion: 2.3.0\nmetadata:\n  name: test\n';
      const ids = new Set(Array.from({ length: 10 }, () => generateDevfileId(content)));
      expect(ids.size).toBe(10);
    });

    it('should use "untitled" prefix when no metadata.name', () => {
      const content = 'schemaVersion: 2.3.0\n';
      const id = generateDevfileId(content);
      expect(id).toMatch(/^untitled-[a-f0-9]{8}$/);
    });

    it('should truncate long names', () => {
      const content =
        'schemaVersion: 2.3.0\nmetadata:\n  name: this-is-a-very-long-workspace-name-that-exceeds-limit\n';
      const id = generateDevfileId(content);
      const prefix = id.split('-').slice(0, -1).join('-');
      expect(prefix.length).toBeLessThanOrEqual(20);
    });
  });

  describe('countProjects', () => {
    it('should count projects', () => {
      const content =
        'schemaVersion: 2.3.0\nprojects:\n  - name: proj1\n    git:\n      remotes:\n        origin: https://github.com/test/proj1\n  - name: proj2\n    git:\n      remotes:\n        origin: https://github.com/test/proj2\n';
      expect(countProjects(content)).toBe(2);
    });

    it('should return 0 when no projects', () => {
      const content = 'schemaVersion: 2.3.0\nmetadata:\n  name: test\n';
      expect(countProjects(content)).toBe(0);
    });

    it('should skip projects without names', () => {
      const content =
        'schemaVersion: 2.3.0\nprojects:\n  - name: valid\n    git:\n      remotes:\n        origin: https://test\n  - git:\n      remotes:\n        origin: https://test2\n';
      expect(countProjects(content)).toBe(1);
    });
  });

  describe('parseEntries', () => {
    it('should parse ConfigMap data to devfile entries', () => {
      const data = {
        'id-1': 'schemaVersion: 2.3.0\nmetadata:\n  name: ws1\n  description: Desc 1\n',
        'id-2':
          'schemaVersion: 2.3.0\nmetadata:\n  name: ws2\nprojects:\n  - name: p1\n    git:\n      remotes:\n        origin: https://test\n',
      };
      const annotations = {
        [`${MODIFIED_ANNOTATION_PREFIX}id-1`]: '2025-01-01T00:00:00Z',
      };

      const entries = parseEntries(data, annotations);
      expect(entries).toHaveLength(2);

      const entry1 = entries.find(e => e.id === 'id-1')!;
      expect(entry1.name).toBe('ws1');
      expect(entry1.description).toBe('Desc 1');
      expect(entry1.lastModified).toBe('2025-01-01T00:00:00Z');

      const entry2 = entries.find(e => e.id === 'id-2')!;
      expect(entry2.name).toBe('ws2');
      expect(entry2.projectCount).toBe(1);
    });

    it('should return empty array for undefined data', () => {
      expect(parseEntries(undefined)).toEqual([]);
    });

    it('should handle entries with generateName', () => {
      const data = {
        'id-1': 'schemaVersion: 2.3.0\nmetadata:\n  generateName: gen-\n',
      };
      const entries = parseEntries(data);
      expect(entries[0].name).toBe('gen-');
    });
  });
});
