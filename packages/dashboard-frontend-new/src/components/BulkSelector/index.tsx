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
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import React from 'react';

import styles from '@/components/BulkSelector/index.module.css';

export type Props = {
  onChange: (tags: string[]) => void;
  list: string[];
  placeholderText: string;
};

export type State = {
  isOpen: boolean;
  selected: string[];
  options: string[];
};

export class BulkSelector extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      selected: [],
      options: [],
    };
  }

  public componentDidMount(): void {
    this.setState({
      options: this.props.list,
    });
  }

  public componentDidUpdate(prevProps: Props): void {
    const { list } = this.props;
    if (prevProps.list !== list) {
      this.setState({
        options: list,
      });
    }
  }

  private onToggle(): void {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  }

  private onSelect(_event: React.MouseEvent | undefined, value: string | number | undefined) {
    if (value === undefined) {
      return;
    }
    const selection = value.toString();
    const selected = [...this.state.selected];
    const index = selected.indexOf(selection);
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(selection);
    }
    this.setState({ selected });
    this.props.onChange(selected);
  }

  render(): React.ReactNode {
    const { placeholderText } = this.props;
    const { isOpen, selected, options } = this.state;

    if (options.length === 0) {
      return <></>;
    }

    const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => this.onToggle()}
        isExpanded={isOpen}
        style={{ width: '200px' }}
      >
        {selected.length > 0 ? `${selected.length} selected` : placeholderText}
      </MenuToggle>
    );

    return (
      <Select
        className={styles.selector}
        isOpen={isOpen}
        selected={selected}
        onSelect={(event, value) => this.onSelect(event, value)}
        onOpenChange={isOpen => this.setState({ isOpen })}
        toggle={toggle}
      >
        <SelectList>
          {options.map(tag => (
            <SelectOption key={tag} value={tag} hasCheckbox isSelected={selected.includes(tag)}>
              {tag}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    );
  }
}
