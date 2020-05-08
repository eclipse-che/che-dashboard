/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

import { IChePfSelectItem, IChePfSelectBindings, IChePfSelectScope } from './che-pf-select-typeahead.directive';

export class ChePfSelectController implements IChePfSelectBindings {

  static $inject = [
    '$scope',
  ];

  // directive scope bindings
  config: {
    default?: IChePfSelectItem;
    emptyState?: string;
    id?: string;
    items: IChePfSelectItem[];
    placeholder: string;
  };
  value?: IChePfSelectItem;
  onClear: () => void;
  onSelect: (eventObj?: {$value: string}) => void;

  // injected services
  private $scope: IChePfSelectScope;

  private selected: IChePfSelectItem;

  constructor($scope: IChePfSelectScope) {
    this.$scope = $scope;
  }

  $onInit(): void {
    const defaultItem = this.config.default;
    if (defaultItem && this.config.items.indexOf(defaultItem) !== -1) {
      this.$scope.typeahead = this.getItemName(this.config.default);
      this.selectItem(this.config.default);
    }
  }

  get items(): IChePfSelectItem[] {
    return this.config.items;
  }

  get emptyState(): string {
    return this.config.emptyState || 'No results found';
  }

  get selectedItem(): IChePfSelectItem {
    return this.selected;
  }

  getItemName(item: IChePfSelectItem): string {
    if (!item) {
      return '';
    }
    return angular.isArray(item) ? item[0] : item;
  }

  getItemValue(item: IChePfSelectItem): string {
    if (!item) {
      return '';
    }
    return angular.isArray(item) ? item[1] : item;
  }

  selectItem(item: IChePfSelectItem): void {
    const value = this.getItemValue(item);
    this.selected = item;
    this.value = item;
    this.onSelect({ $value: value });
  }

  clearSelectedItem(): void {
    delete this.selected;
    this.onClear();
  }

  isSelected(item: IChePfSelectItem): boolean {
    if (!this.selected) {
      return false;
    }
    return this.getItemName(this.selected) === this.getItemName(item)
      && this.getItemValue(this.selected) === this.getItemValue(item);
  }

}
