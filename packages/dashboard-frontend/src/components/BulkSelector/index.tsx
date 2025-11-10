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

import { Select, SelectOption, SelectOptionObject, SelectVariant } from '@patternfly/react-core';
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
  options: React.ReactElement[];
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
    const options = this.getOptions(this.props.list);
    this.setState({
      options,
    });
  }

  public componentDidUpdate(prevProps: Props): void {
    const { list } = this.props;
    if (prevProps.list !== list) {
      const options = this.getOptions(list);
      this.setState({
        options,
      });
    }
  }

  private getOptions(list: string[]): React.ReactElement[] {
    return list.map(tag => <SelectOption key={tag} value={tag} />);
  }

  private onToggle(isOpen: boolean): void {
    this.setState({
      isOpen,
    });
  }

  private onSelect(selection: string) {
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

    return (
      <Select
        className={styles.selector}
        variant={SelectVariant.checkbox}
        onToggle={isOpen => this.onToggle(isOpen)}
        onSelect={(
          _event: React.MouseEvent | React.ChangeEvent,
          selection: string | SelectOptionObject,
        ) => this.onSelect(selection.toString())}
        selections={selected}
        isOpen={isOpen}
        placeholderText={placeholderText}
        isGrouped
      >
        {options}
      </Select>
    );
  }
}
