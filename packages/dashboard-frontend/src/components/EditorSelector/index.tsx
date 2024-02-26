/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Panel,
  PanelHeader,
  PanelMain,
  PanelMainBody,
  Title,
} from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { EditorDefinition } from '@/components/EditorSelector/Definition';
import { EditorGallery } from '@/components/EditorSelector/Gallery';
import { AppState } from '@/store';
import { selectEditors } from '@/store/Plugins/chePlugins/selectors';

type AccordionId = 'selector' | 'definition';

export type Props = MappedProps & {
  selectedEditorDefinition: string;
  onSelect: (editorDefinition: string | undefined, editorImage: string | undefined) => void;
};
export type State = {
  expandedId: AccordionId | undefined;
};

class EditorSelector extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      expandedId: 'selector',
    };
  }

  private handleEditorSelect(
    editorDefinition: string | undefined,
    editorImage: string | undefined,
  ): void {
    this.props.onSelect(editorDefinition, editorImage);
  }

  private handleToggle(expandedId: AccordionId): void {
    const { selectedEditorDefinition, onSelect } = this.props;
    onSelect(selectedEditorDefinition, undefined);

    this.setState({
      expandedId: this.state.expandedId === expandedId ? this.state.expandedId : expandedId,
    });
  }

  render(): React.ReactElement {
    const { editors, selectedEditorDefinition } = this.props;
    const { expandedId } = this.state;

    return (
      <Panel>
        <PanelHeader>
          <Title headingLevel="h3">Editor Selector</Title>
        </PanelHeader>
        <PanelMain>
          <PanelMainBody>
            <Accordion asDefinitionList={false}>
              <AccordionItem>
                <AccordionToggle
                  onClick={() => {
                    this.handleToggle('selector');
                  }}
                  isExpanded={expandedId === 'selector'}
                  id="accordion-item-selector"
                >
                  Choose an Editor
                </AccordionToggle>

                <AccordionContent
                  isHidden={expandedId !== 'selector'}
                  data-testid="editor-gallery-content"
                >
                  <Panel>
                    <PanelMain>
                      <PanelMainBody>
                        <EditorGallery
                          editors={editors}
                          selectedEditorId={selectedEditorDefinition}
                          onSelect={editorId => this.handleEditorSelect(editorId, undefined)}
                        />
                      </PanelMainBody>
                    </PanelMain>
                  </Panel>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem>
                <AccordionToggle
                  onClick={() => {
                    this.handleToggle('definition');
                  }}
                  isExpanded={expandedId === 'definition'}
                  id="accordion-item-definition"
                >
                  Use an Editor Definition
                </AccordionToggle>

                <AccordionContent
                  isHidden={expandedId !== 'definition'}
                  data-testid="editor-definition-content"
                >
                  <Panel>
                    <PanelMain>
                      <PanelMainBody>
                        <EditorDefinition
                          onChange={(editorDefinition, editorImage) =>
                            this.handleEditorSelect(editorDefinition, editorImage)
                          }
                        />
                      </PanelMainBody>
                    </PanelMain>
                  </Panel>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </PanelMainBody>
        </PanelMain>
      </Panel>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  editors: selectEditors(state),
});

const connector = connect(mapStateToProps, null, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(EditorSelector);
