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

import { Architecture } from '@eclipse-che/common';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { CogIcon, CubesIcon } from '@patternfly/react-icons';
import React from 'react';
import sanitizeHtml from 'sanitize-html';

import { DocsLink } from '@/components/EditorSelector/DocsLink';
import styles from '@/components/EditorSelector/Dropdown/index.module.css';
import { Spacer } from '@/components/Spacer';
import { TagLabel } from '@/components/TagLabel';
import { che } from '@/services/models';

export type Props = {
  defaultEditorId: string;
  editors: che.Plugin[];
  currentArchitecture: Architecture;
  selectedEditorId: string | undefined;
  editorsVisibilityConfig: { showDeprecated: boolean; hideById: string[] } | undefined;
  onSelect: (editorId: string) => void;
  onDefaultEditorClick: () => void;
  onCustomEditorClick: () => void;
  /** Name of the selected custom editor, if one is selected. */
  customEditorName?: string;
  /** Whether the consumer can act on a custom editor. Defaults to true. */
  canUseCustomEditor?: boolean;
};
export type State = {
  selectedId: string;
  isEditorDropdownOpen: boolean;
  isVersionSelectOpen: boolean;
  sortedEditorsByName: Map<string, che.Plugin[]>;
};

const FIELD_ID = 'editor-selector';
const VERSION_PRIORITY: ReadonlyArray<string> = ['insiders', 'next', 'latest'];
const DEPRECATED_TAG = 'Deprecated';
const GROUP_PRIORITY = 'che-code';
const ALLOWED_TAGS = ['Tech Preview', 'Deprecated'];

export class EditorDropdown extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedId: '',
      isEditorDropdownOpen: false,
      isVersionSelectOpen: false,
      sortedEditorsByName: new Map<string, che.Plugin[]>(),
    };
  }

  public componentDidMount(): void {
    this.init();
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    // the editors arrive from the plugin registry after the first render, and
    // the architecture and the visibility config decide which of them are
    // listed, so the groups have to be rebuilt whenever any of them changes
    if (
      prevProps.selectedEditorId !== this.props.selectedEditorId ||
      prevProps.editors !== this.props.editors ||
      prevProps.currentArchitecture !== this.props.currentArchitecture ||
      prevProps.editorsVisibilityConfig !== this.props.editorsVisibilityConfig
    ) {
      this.init();
    }
  }

  private init(): void {
    const { editorsVisibilityConfig, editors, currentArchitecture, selectedEditorId } = this.props;

    const filteredEditors = filterEditors(editors, currentArchitecture, editorsVisibilityConfig);
    const sortedEditors = sortEditors(filteredEditors);

    const sortedEditorsByName = new Map<string, che.Plugin[]>();

    let selectedEditor: che.Plugin | undefined;
    sortedEditors.forEach(editor => {
      const name = editor.name;
      if (!sortedEditorsByName.has(name)) {
        sortedEditorsByName.set(name, []);
      }
      sortedEditorsByName.get(name)?.push(editor);

      if (editor.id === selectedEditorId) {
        selectedEditor = editor;
      }
    });

    // an empty id means "Default Editor" - nothing is sent to the factory and
    // the editor configured on the cluster is used
    this.setState({
      selectedId: selectedEditor !== undefined ? selectedEditor.id : '',
      sortedEditorsByName,
    });
  }

  private getSelectedEditor(): che.Plugin | undefined {
    const { selectedId, sortedEditorsByName } = this.state;
    for (const editorsGroup of sortedEditorsByName.values()) {
      const editor = editorsGroup.find(e => e.id === selectedId);
      if (editor) {
        return editor;
      }
    }
    return undefined;
  }

  private getEditorsByName(): string[] {
    return sortEditorsNames(Array.from(this.state.sortedEditorsByName.keys()));
  }

  private handleEditorSelect(editorName: string): void {
    const editorsGroup = this.state.sortedEditorsByName.get(editorName);
    if (!editorsGroup || editorsGroup.length === 0) {
      return;
    }

    const selectedEditor = editorsGroup[0];
    this.setState({
      selectedId: selectedEditor.id,
      isEditorDropdownOpen: false,
    });
    this.props.onSelect(selectedEditor.id);
  }

  private handleVersionSelect(editorId: string): void {
    this.setState({
      selectedId: editorId,
      isVersionSelectOpen: false,
    });
    this.props.onSelect(editorId);
  }

  private buildEditorDropdownItems(): React.ReactNode[] {
    const editorNames = this.getEditorsByName();
    const { customEditorName } = this.props;
    const selectedEditor = this.getSelectedEditor();
    const isCustomEditorSelected = customEditorName !== undefined;
    const items: React.ReactNode[] = [];

    // Add "Default Editor" as the first option
    items.push(
      <DropdownItem
        key="default-editor"
        onClick={() => {
          this.setState({ isEditorDropdownOpen: false });
          this.props.onDefaultEditorClick();
        }}
        isSelected={!isCustomEditorSelected && this.state.selectedId === ''}
        data-testid="default-editor-dropdown-item"
      >
        <div className={styles.itemContent}>
          <CubesIcon className={styles.icon} />
          <div className={styles.itemMain}>
            <span className={styles.itemName}>Default Editor</span>
          </div>
        </div>
      </DropdownItem>,
    );

    editorNames.forEach(editorName => {
      const editorsGroup = this.state.sortedEditorsByName.get(editorName);
      if (!editorsGroup || editorsGroup.length === 0) {
        return;
      }

      const groupIcon = editorsGroup[0].icon;
      const groupIconMediatype = editorsGroup[0].iconMediatype || '';
      const groupName = editorsGroup[0].displayName || editorsGroup[0].name;
      const activeEditor = editorsGroup[0];
      const defaultVersionId = this.getDefaultVersionId(editorName);
      const isDefault = defaultVersionId === this.props.defaultEditorId;

      const icon =
        groupIconMediatype === 'image/svg+xml'
          ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(groupIcon)}`
          : groupIcon;

      const tags = (activeEditor.tags || [])
        .map(tag => {
          const words = tag.trim().toLowerCase().replace(/-/g, ' ').split(' ');
          return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        })
        .filter(tag => ALLOWED_TAGS.includes(tag));

      items.push(
        <DropdownItem
          key={editorName}
          onClick={() => this.handleEditorSelect(editorName)}
          isSelected={!isCustomEditorSelected && selectedEditor?.name === editorName}
          data-testid="editor-dropdown-item"
        >
          <div className={styles.itemContent}>
            <img src={icon} alt={`${groupName} icon`} className={styles.icon} />
            <div className={styles.itemMain}>
              <div className={styles.itemTitle}>
                <span className={styles.itemName}>{groupName}</span>
                {isDefault && <TagLabel type="default" text="default" />}
                {tags.length > 0 && tags.map(tag => <TagLabel key={tag} type="tag" text={tag} />)}
              </div>
            </div>
          </div>
          {activeEditor.provider && (
            <div className={styles.itemDescription}>
              {React.createElement('span', {
                dangerouslySetInnerHTML: {
                  __html: sanitizeHtml(
                    activeEditor.provider.replace(
                      /\[([^\]]+)\]\(([^)]+)\)/g,
                      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
                    ),
                    {
                      allowedTags: ['a'],
                      allowedAttributes: {
                        a: ['href', 'target', 'rel'],
                      },
                      allowedSchemes: ['http', 'https'],
                    },
                  ),
                },
              })}
            </div>
          )}
        </DropdownItem>,
      );
    });

    // Add custom editor option at the bottom
    if (this.props.canUseCustomEditor !== false) {
      items.push(
        <DropdownItem
          key="custom-editor"
          onClick={() => {
            this.setState({ isEditorDropdownOpen: false });
            this.props.onCustomEditorClick();
          }}
          data-testid="custom-editor-dropdown-item"
        >
          <div className={styles.itemContent}>
            <CogIcon className={styles.icon} />
            <div className={styles.itemMain}>
              <span className={styles.itemName}>Custom Editor</span>
            </div>
          </div>
        </DropdownItem>,
      );
    }

    return items;
  }

  private getDefaultVersionId(editorName: string): string | undefined {
    const editorsGroup = this.state.sortedEditorsByName.get(editorName);
    if (!editorsGroup || editorsGroup.length === 0) {
      return undefined;
    }
    return editorsGroup[0].id;
  }

  private buildVersionOptions(): React.ReactNode[] {
    const selectedEditor = this.getSelectedEditor();
    if (!selectedEditor) {
      return [];
    }

    const editorName = selectedEditor.name;
    const editorsGroup = this.state.sortedEditorsByName.get(editorName) || [];
    const defaultVersionId = this.getDefaultVersionId(editorName);

    return editorsGroup.map(editor => {
      // Only show "default" label if this version is the default AND this editor is the default editor
      const isDefaultVersion = editor.id === defaultVersionId;
      const isDefaultEditor = defaultVersionId === this.props.defaultEditorId;
      const showDefaultLabel = isDefaultVersion && isDefaultEditor;

      return (
        <SelectOption
          key={editor.id}
          value={editor.id}
          isSelected={editor.id === this.state.selectedId}
          data-testid="version-select-option"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{editor.version}</span>
            {showDefaultLabel && <TagLabel type="default" text="default" />}
          </div>
        </SelectOption>
      );
    });
  }

  render(): React.ReactElement {
    const { isEditorDropdownOpen, isVersionSelectOpen, selectedId } = this.state;
    const { customEditorName } = this.props;
    const selectedEditor = this.getSelectedEditor();
    const isCustomEditorSelected = customEditorName !== undefined;
    const isDefaultEditorSelected = selectedId === '';

    // Show either selected editor or custom editor or default
    let selectedEditorName = 'Default Editor';
    let tags: string[] = [];
    let showDefaultLabel = false;
    let iconSrc = '';

    if (isCustomEditorSelected) {
      selectedEditorName = customEditorName;
    } else if (selectedEditor) {
      selectedEditorName = selectedEditor.displayName || selectedEditor.name;
      iconSrc =
        selectedEditor.iconMediatype === 'image/svg+xml'
          ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(selectedEditor.icon)}`
          : selectedEditor.icon;

      const editorName = selectedEditor.name;
      const editorsGroup = this.state.sortedEditorsByName.get(editorName) || [];
      const defaultVersionId = editorsGroup.length > 0 ? editorsGroup[0].id : undefined;
      const isSelectedVersionDefault = selectedEditor.id === defaultVersionId;
      const isDefaultEditor = defaultVersionId === this.props.defaultEditorId;
      showDefaultLabel = isSelectedVersionDefault && isDefaultEditor;

      tags = (selectedEditor.tags || [])
        .map(tag => {
          const words = tag.trim().toLowerCase().replace(/-/g, ' ').split(' ');
          return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        })
        .filter(tag => ALLOWED_TAGS.includes(tag));
    }

    return (
      <div>
        {/* horizontal form and the 500px/70% field width mirror the Git repo URL
            field in ImportFromGit, so the two panels line up */}
        <Form isHorizontal={true} onSubmit={e => e.preventDefault()}>
          <FormGroup fieldId={FIELD_ID} label="Select an Editor">
            {/* Flex aligns on the baseline by default. The editor toggle takes its
                baseline from the icon image (bottom edge), the version toggle from
                text, so the two would sit at different heights. */}
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem grow={{ default: 'grow' }} style={{ maxWidth: '500px', minWidth: '70%' }}>
                <Dropdown
                  isOpen={isEditorDropdownOpen}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      id={FIELD_ID}
                      ref={toggleRef}
                      isFullWidth
                      onClick={() => this.setState({ isEditorDropdownOpen: !isEditorDropdownOpen })}
                      isExpanded={isEditorDropdownOpen}
                      data-testid="editor-dropdown-toggle"
                    >
                      <div className={styles.toggleButton}>
                        {isCustomEditorSelected && <CogIcon className={styles.toggleIcon} />}
                        {isDefaultEditorSelected && <CubesIcon className={styles.toggleIcon} />}
                        {!isCustomEditorSelected && !isDefaultEditorSelected && (
                          <img
                            src={iconSrc}
                            alt={`${selectedEditorName} icon`}
                            className={styles.toggleIcon}
                          />
                        )}
                        <div className={styles.toggleContent}>
                          <span>{selectedEditorName}</span>
                          {tags.length > 0 &&
                            tags.map(tag => <TagLabel key={tag} type="tag" text={tag} />)}
                          {showDefaultLabel && <TagLabel type="default" text="default" />}
                        </div>
                      </div>
                    </MenuToggle>
                  )}
                  onOpenChange={isOpen => this.setState({ isEditorDropdownOpen: isOpen })}
                >
                  <DropdownList className={styles.dropdownList}>
                    {this.buildEditorDropdownItems()}
                  </DropdownList>
                </Dropdown>
              </FlexItem>

              {!isCustomEditorSelected && !isDefaultEditorSelected && (
                <FlexItem>
                  <Select
                    isOpen={isVersionSelectOpen}
                    onOpenChange={isOpen => this.setState({ isVersionSelectOpen: isOpen })}
                    onSelect={(e, value) => {
                      if (typeof value === 'string') {
                        this.handleVersionSelect(value);
                      }
                    }}
                    selected={selectedId}
                    data-testid="version-select"
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        className={styles.versionToggle}
                        onClick={() => this.setState({ isVersionSelectOpen: !isVersionSelectOpen })}
                        isExpanded={isVersionSelectOpen}
                        data-testid="version-select-toggle"
                      >
                        {selectedEditor?.version}
                      </MenuToggle>
                    )}
                  >
                    <SelectList>{this.buildVersionOptions()}</SelectList>
                  </Select>
                </FlexItem>
              )}
            </Flex>
          </FormGroup>
        </Form>

        <Spacer />

        <DocsLink />
      </div>
    );
  }
}

export function filterEditors(
  editors: che.Plugin[],
  currentArchitecture: Architecture,
  editorsVisibilityConfig: { showDeprecated: boolean; hideById: string[] } | undefined,
) {
  return editors.filter(editor => {
    if (!editor.arch || editor.arch.indexOf(currentArchitecture) === -1) {
      return false;
    }

    if (!editorsVisibilityConfig?.showDeprecated && editor.tags?.includes(DEPRECATED_TAG)) {
      return false;
    }

    const hideById = editorsVisibilityConfig?.hideById || [];
    if (hideById.includes(editor.id)) {
      return false;
    }

    return true;
  });
}

export function sortEditors(editors: che.Plugin[]) {
  if (editors.length === 0) {
    return editors;
  }
  const sorted = editors
    .sort((a, b) => {
      if (a.name === b.name) {
        const aPriority = VERSION_PRIORITY.indexOf(a.version);
        const bPriority = VERSION_PRIORITY.indexOf(b.version);

        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        } else if (aPriority !== -1) {
          return -1;
        } else if (bPriority !== -1) {
          return 1;
        }
      }

      return a.id.localeCompare(b.id);
    })
    .sort((a, b) => {
      if (a.name === b.name) {
        const aPriority = a.tags?.includes(DEPRECATED_TAG) ? -1 : 1;
        const bPriority = b.tags?.includes(DEPRECATED_TAG) ? -1 : 1;

        if (aPriority !== -1 && bPriority !== -1) {
          return 0;
        } else if (aPriority !== -1) {
          return -1;
        } else if (bPriority !== -1) {
          return 1;
        }
      }

      return a.id.localeCompare(b.id);
    });

  return sorted;
}

export function sortEditorsNames(editorsNames: string[]) {
  return editorsNames.sort((a, b) => {
    if (a.startsWith(GROUP_PRIORITY) && !b.startsWith(GROUP_PRIORITY)) {
      return -1;
    }
    if (b.startsWith(GROUP_PRIORITY) && !a.startsWith(GROUP_PRIORITY)) {
      return 1;
    }
    if (a.startsWith(GROUP_PRIORITY) && b.startsWith(GROUP_PRIORITY)) {
      if (a === GROUP_PRIORITY) {
        return -1;
      }
      if (b === GROUP_PRIORITY) {
        return 1;
      }
    }
    return a.localeCompare(b);
  });
}
