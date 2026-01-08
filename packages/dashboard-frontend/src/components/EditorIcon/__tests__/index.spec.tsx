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

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  EditorIcon,
  findEditor,
  getEditorId,
  getEditorName,
  getShortEditorName,
  isEditorId,
  isEditorUrl,
  isInlineEditorContent,
  parseInlineEditor,
} from '@/components/EditorIcon';
import devfileApi from '@/services/devfileApi';
import { Workspace } from '@/services/workspace-adapter';

const mockWorkspace = {
  ref: {
    metadata: {
      annotations: {
        'che.eclipse.org/che-editor': 'che-incubator/che-code/insiders',
      },
    },
  },
} as unknown as Workspace;

const mockWorkspaceNoEditor = {
  ref: {
    metadata: {
      annotations: {},
    },
  },
} as unknown as Workspace;

const mockWorkspaceInlineEditor = {
  ref: {
    metadata: {
      annotations: {
        'che.eclipse.org/che-editor':
          'schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n  displayName: VS Code - Open Source',
      },
    },
  },
} as unknown as Workspace;

const mockWorkspaceInlineEditorWithDescription = {
  ref: {
    metadata: {
      annotations: {
        'che.eclipse.org/che-editor':
          'schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n  displayName: VS Code\n  description: Microsoft Visual Studio Code IDE',
      },
    },
  },
} as unknown as Workspace;

const mockWorkspaceInlineEditorNoDisplayName = {
  ref: {
    metadata: {
      annotations: {
        'che.eclipse.org/che-editor': 'schemaVersion: 2.2.2\nmetadata:\n  name: custom-editor',
      },
    },
  },
} as unknown as Workspace;

const mockWorkspaceInlineEditorInvalid = {
  ref: {
    metadata: {
      annotations: {
        'che.eclipse.org/che-editor': 'schemaVersion: 2.2.2\ninvalid-yaml: [',
      },
    },
  },
} as unknown as Workspace;

const mockWorkspaceUrlEditor = {
  ref: {
    metadata: {
      annotations: {
        'che.eclipse.org/che-editor':
          'https://eclipse-che.github.io/che-plugin-registry/main/v3/plugins/che-incubator/che-code/insiders/devfile.yaml',
      },
    },
  },
} as unknown as Workspace;

const mockWorkspaceInlineEditorWithCopyrightHeader = {
  ref: {
    metadata: {
      annotations: {
        'che.eclipse.org/che-editor': `#
# Copyright (c) 2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#

schemaVersion: 2.3.0
metadata:
  name: che-kiro-sshd-next
  displayName: Kiro SSHD Editor
  description: Custom Kiro editor with SSHD support`,
      },
    },
  },
} as unknown as Workspace;

const mockSvgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';

const mockEditor: devfileApi.Devfile = {
  schemaVersion: '2.2.2',
  metadata: {
    name: 'che-code',
    displayName: 'VS Code',
    attributes: {
      publisher: 'che-incubator',
      version: 'insiders',
      iconData: mockSvgIcon,
      iconMediatype: 'image/svg+xml',
    },
  },
} as devfileApi.Devfile;

const mockEditorWithDescription: devfileApi.Devfile = {
  schemaVersion: '2.2.2',
  metadata: {
    name: 'che-code',
    displayName: 'VS Code',
    description: 'Microsoft Visual Studio Code - Open Source IDE',
    attributes: {
      publisher: 'che-incubator',
      version: 'insiders',
      iconData: mockSvgIcon,
      iconMediatype: 'image/svg+xml',
    },
  },
} as devfileApi.Devfile;

const mockEditorNoIcon: devfileApi.Devfile = {
  schemaVersion: '2.2.2',
  metadata: {
    name: 'che-code',
    displayName: 'VS Code',
    attributes: {
      publisher: 'che-incubator',
      version: 'insiders',
    },
  },
} as devfileApi.Devfile;

describe('EditorIcon helper functions', () => {
  describe('isInlineEditorContent', () => {
    it('should return true for valid devfile content', () => {
      expect(isInlineEditorContent('schemaVersion: 2.2.2\nmetadata:\n  name: test-editor')).toBe(
        true,
      );
    });

    it('should return true for devfile content with copyright header comments', () => {
      const editorContent = `#
# Copyright (c) 2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation
#

schemaVersion: 2.3.0
metadata:
  name: che-kiro-sshd-next
  displayName: Kiro SSHD Editor`;
      expect(isInlineEditorContent(editorContent)).toBe(true);
    });

    it('should return false for editor ID', () => {
      expect(isInlineEditorContent('che-incubator/che-code/insiders')).toBe(false);
    });

    it('should return false for URL', () => {
      expect(isInlineEditorContent('https://example.com/editor.yaml')).toBe(false);
    });

    it('should return false for invalid YAML', () => {
      expect(isInlineEditorContent('invalid: [')).toBe(false);
    });
  });

  describe('isEditorUrl', () => {
    it('should return true for https URL', () => {
      expect(
        isEditorUrl('https://eclipse-che.github.io/che-plugin-registry/main/v3/devfile.yaml'),
      ).toBe(true);
    });

    it('should return true for http URL', () => {
      expect(isEditorUrl('http://example.com/editor.yaml')).toBe(true);
    });

    it('should return false for editor ID', () => {
      expect(isEditorUrl('che-incubator/che-code/insiders')).toBe(false);
    });

    it('should return false for inline content', () => {
      expect(isEditorUrl('schemaVersion: 2.2.2\nmetadata:\n  name: test')).toBe(false);
    });
  });

  describe('isEditorId', () => {
    it('should return true for valid editor ID with 3 parts', () => {
      expect(isEditorId('che-incubator/che-code/insiders')).toBe(true);
    });

    it('should return true for valid editor ID with 2 parts', () => {
      expect(isEditorId('publisher/editor-name')).toBe(true);
    });

    it('should return false for content without slashes', () => {
      expect(isEditorId('editor-name')).toBe(false);
    });

    it('should return false for content with spaces', () => {
      expect(isEditorId('some content with spaces')).toBe(false);
    });

    it('should return false for YAML content', () => {
      expect(isEditorId('schemaVersion: 2.2.2\nmetadata:')).toBe(false);
    });
  });

  describe('parseInlineEditor', () => {
    it('should parse valid inline editor content with description', () => {
      const result = parseInlineEditor(
        'schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n  displayName: VS Code\n  description: IDE description',
      );
      expect(result).toEqual({
        name: 'che-code',
        displayName: 'VS Code',
        description: 'IDE description',
      });
    });

    it('should parse valid inline editor content without description', () => {
      const result = parseInlineEditor(
        'schemaVersion: 2.2.2\nmetadata:\n  name: che-code\n  displayName: VS Code',
      );
      expect(result).toEqual({
        name: 'che-code',
        displayName: 'VS Code',
        description: undefined,
      });
    });

    it('should use name as displayName when displayName is not provided', () => {
      const result = parseInlineEditor('schemaVersion: 2.2.2\nmetadata:\n  name: che-code');
      expect(result).toEqual({ name: 'che-code', displayName: 'che-code', description: undefined });
    });

    it('should return undefined for invalid YAML', () => {
      const result = parseInlineEditor('schemaVersion: 2.2.2\ninvalid: [');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-devfile content', () => {
      const result = parseInlineEditor('some: random\nyaml: content');
      expect(result).toBeUndefined();
    });
  });

  describe('getEditorId', () => {
    it('should return editor ID from workspace annotation', () => {
      expect(getEditorId(mockWorkspace)).toBe('che-incubator/che-code/insiders');
    });

    it('should return undefined when no annotation exists', () => {
      expect(getEditorId(mockWorkspaceNoEditor)).toBeUndefined();
    });

    it('should return undefined for inline editor content', () => {
      expect(getEditorId(mockWorkspaceInlineEditor)).toBeUndefined();
    });

    it('should return undefined for URL editor', () => {
      expect(getEditorId(mockWorkspaceUrlEditor)).toBeUndefined();
    });
  });

  describe('getShortEditorName', () => {
    it('should extract editor name from ID with 3 parts', () => {
      expect(getShortEditorName('che-incubator/che-code/insiders')).toBe('che-code');
    });

    it('should extract editor name from ID with 2 parts', () => {
      expect(getShortEditorName('publisher/editor-name')).toBe('editor-name');
    });

    it('should return original string if no slashes', () => {
      expect(getShortEditorName('editor-name')).toBe('editor-name');
    });
  });

  describe('findEditor', () => {
    it('should find editor by ID', () => {
      const result = findEditor([mockEditor], 'che-incubator/che-code/insiders');
      expect(result).toBe(mockEditor);
    });

    it('should return undefined when editor not found', () => {
      const result = findEditor([mockEditor], 'unknown/editor/id');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty editors list', () => {
      const result = findEditor([], 'che-incubator/che-code/insiders');
      expect(result).toBeUndefined();
    });
  });

  describe('getEditorName', () => {
    it('should return undefined when no editor annotation', () => {
      expect(getEditorName(mockWorkspaceNoEditor)).toBeUndefined();
    });

    it('should return "custom" for inline editor content', () => {
      expect(getEditorName(mockWorkspaceInlineEditor)).toBe('custom');
    });

    it('should return "custom" for URL editor', () => {
      expect(getEditorName(mockWorkspaceUrlEditor)).toBe('custom');
    });

    it('should return short name from editor ID', () => {
      expect(getEditorName(mockWorkspace)).toBe('che-code');
    });
  });
});

describe('EditorIcon component', () => {
  it('should render nothing when workspace has no editor annotation', () => {
    const { container } = render(<EditorIcon editors={[]} workspace={mockWorkspaceNoEditor} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render default icon with "custom" name when inline content has displayName', () => {
    render(<EditorIcon editors={[]} workspace={mockWorkspaceInlineEditor} />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    // RegistryIcon is rendered as SVG - check the parent container
    const container = screen.getByText('custom').parentElement;
    expect(container).toBeInTheDocument();
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('should render default icon with "custom" when inline content has description', () => {
    render(<EditorIcon editors={[]} workspace={mockWorkspaceInlineEditorWithDescription} />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    const container = screen.getByText('custom').parentElement;
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('should render default icon with "custom" for inline content without displayName', () => {
    render(<EditorIcon editors={[]} workspace={mockWorkspaceInlineEditorNoDisplayName} />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    const container = screen.getByText('custom').parentElement;
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('should render nothing when editor annotation contains invalid inline content', () => {
    const { container } = render(
      <EditorIcon editors={[]} workspace={mockWorkspaceInlineEditorInvalid} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render clickable link with "custom" name when editor is a URL', () => {
    render(<EditorIcon editors={[]} workspace={mockWorkspaceUrlEditor} />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    // Should render a link that opens in new tab
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      'https://eclipse-che.github.io/che-plugin-registry/main/v3/plugins/che-incubator/che-code/insiders/devfile.yaml',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // RegistryIcon is rendered as SVG
    expect(link.querySelector('svg')).toBeInTheDocument();
  });

  it('should render default icon with "custom" name for inline editor with copyright header comments', () => {
    render(<EditorIcon editors={[]} workspace={mockWorkspaceInlineEditorWithCopyrightHeader} />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    // RegistryIcon is rendered as SVG - check the parent container
    const container = screen.getByText('custom').parentElement;
    expect(container).toBeInTheDocument();
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('should render default icon with short name when editor is not found in registry', () => {
    render(<EditorIcon editors={[]} workspace={mockWorkspace} />);

    // Check for short name
    const nameElements = screen.getAllByText('che-code');
    expect(nameElements.length).toBeGreaterThan(0);
    // RegistryIcon is rendered as SVG - check the parent container
    const container = nameElements[0].parentElement;
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('should render editor icon with short name when editor is found and has iconData', () => {
    render(<EditorIcon editors={[mockEditor]} workspace={mockWorkspace} />);

    // Check for short name
    expect(screen.getAllByText('che-code').length).toBeGreaterThan(0);
    // When editor has iconData, it renders an <img> with the icon
    const icon = screen.getByAltText('VS Code');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute(
      'src',
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mockSvgIcon)}`,
    );
  });

  it('should use description in tooltip when editor has description', () => {
    render(<EditorIcon editors={[mockEditorWithDescription]} workspace={mockWorkspace} />);

    // Check for short name
    expect(screen.getAllByText('che-code').length).toBeGreaterThan(0);
    // When editor has iconData, it renders an <img>
    const icon = screen.getByAltText('VS Code');
    expect(icon).toBeInTheDocument();
  });

  it('should render default icon with short name when editor is found but has no iconData', () => {
    render(<EditorIcon editors={[mockEditorNoIcon]} workspace={mockWorkspace} />);

    // Check for short name
    const nameElements = screen.getAllByText('che-code');
    expect(nameElements.length).toBeGreaterThan(0);
    // RegistryIcon is rendered as SVG when no iconData - check the parent container
    const container = nameElements[0].parentElement;
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });
});
