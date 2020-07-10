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
'use string';

import { RandomSvc } from '../../utils/random.service';
import { ChePfSelectController } from './che-pf-select.controller';

export type IChePfSelectItemName = string;
export type IChePfSelectItemValue = any;
export type IChePfSelectItem = IChePfSelectItemName | [IChePfSelectItemName, IChePfSelectItemValue];

interface IChePfSelectBase {
  config: {
    default?: IChePfSelectItem;
    disabled?: boolean;
    emptyState?: string;
    id?: string;
    items: IChePfSelectItem[];
    placeholder: string;
  };
  value?: IChePfSelectItem;
  onClear?: () => void;
  onSelect: Function;
}

export interface IChePfSelectProperties<T> extends IChePfSelectBase {
  onSelect: ($value: T) => void;
}

export interface IChePfSelectBindings extends IChePfSelectBase {
  onSelect: (eventObj: { $value: any }) => void;
}

interface IChePfSelectDirectiveScope {
  scope: { [key in keyof IChePfSelectBindings]: string };
}

export interface IChePfSelectScope extends ng.IScope, IChePfSelectBindings {
  labelId: string;
  typeaheadId: string;
  toggleId: string;
  expanded: boolean;
  expandItemsList: () => void;
  toggleItemsList: () => void;
  collapseItemsList: () => void;
  filterBy: string;
  typeahead: string;
  clearTypeahead: () => void;
  onTypeahead: (value: string) => void;
  selectItem: (item: IChePfSelectItem) => void;
  highlight: (text: string) => void;
}

/**
 * @ngdoc directive
 *
 * @description defines a select component.
 *
 * @usage
 *   <che-pf-select
 *    config="ctrl.selectProperties.config"
 *    value="ctrl.selectProperties.value"
 *    on-select="ctrl.selectProperties.onSelect($value)"></che-pf-select>
 *
 * @author Oleksii Kurinnyi
 */
export class ChePfSelectTypeahead implements ng.IDirective, IChePfSelectDirectiveScope {

  static $inject = [
    '$document',
    '$sce',
    'randomSvc',
  ];

  bindToController = true;
  controller = 'ChePfSelectController';
  controllerAs = 'ctrl';
  templateUrl = 'components/che-pf-widget/select/che-pf-select-typeahead.html';

  scope = {
    config: '=',
    value: '=?',
    onClear: '&',
    onSelect: '&',
  };

  // IDs
  protected labelId = 'select-single-typeahead-expanded-selected-label';
  protected typeaheadId = 'select-single-typeahead-expanded-selected-typeahead';
  protected toggleId = 'select-single-typeahead-expanded-selected-toggle';

  // injected services
  private $document: ng.IDocumentService;
  private $sce: ng.ISCEService;
  private randomSvc: RandomSvc;

  constructor(
    $document: ng.IDocumentService,
    $sce: ng.ISCEService,
    randomSvc: RandomSvc,
  ) {
    this.$document = $document;
    this.$sce = $sce;
    this.randomSvc = randomSvc;
  }

  link($scope: IChePfSelectScope, element: any, attrs: any, ctrl: ChePfSelectController): void {
    // set IDs
    $scope.labelId = this.randomSvc.getRandString({ prefix: this.labelId });
    $scope.typeaheadId = this.randomSvc.getRandString({ prefix: this.typeaheadId });
    if (!ctrl.config.id) {
      ctrl.config.id = this.randomSvc.getRandString({ prefix: this.toggleId });
    }
    $scope.toggleId = ctrl.config.id;

    $scope.$watch(() => ctrl.value, (newItem, oldItem) => {
      if (newItem && ctrl.getItemValue(newItem) === ctrl.getItemValue(ctrl.selectedItem)) {
        return;
      }
      if (newItem && ctrl.config.items.indexOf(newItem) !== -1) {
        $scope.selectItem(newItem);
        return;
      }
      if (!newItem && !oldItem) {
        return;
      }
      if (!newItem) {
        $scope.clearTypeahead();
      }
    });

    // handles clicks outside of the component
    // to collapse the items list
    // and clear typeahead field
    // and restore last selected item
    const outsideClickHandler = (eventTarget => {
      const closestPfSelect = angular.element(eventTarget.target).closest('.pf-c-select');
      const closestPfSelectLabel = angular.element(eventTarget.target).closest(`label[for="${$scope.toggleId}"]`);
      if (closestPfSelect.length === 0 && closestPfSelectLabel.length === 0) {
        $scope.filterBy = '';
        $scope.typeahead = ctrl.getItemName(ctrl.selectedItem);
        $scope.collapseItemsList();
        $scope.$digest();
      }
    });

    $scope.expandItemsList = () => {
      $scope.expanded = true;
      this.$document.on('click', outsideClickHandler);
    };
    $scope.collapseItemsList = () => {
      $scope.expanded = false;
      this.$document.off('click', outsideClickHandler);
    };
    $scope.toggleItemsList = () => {
      if ($scope.expanded) {
        $scope.collapseItemsList();
      } else {
        $scope.expandItemsList();
      }
    };
    $scope.clearTypeahead = () => {
      $scope.filterBy = '';
      $scope.typeahead = '';
      ctrl.clearSelectedItem();
      $scope.collapseItemsList();
    };
    $scope.onTypeahead = (value: string) => {
      $scope.filterBy = value;
    };
    $scope.selectItem = item => {
      $scope.typeahead = ctrl.getItemName(item);
      ctrl.selectItem(item);
      $scope.collapseItemsList();
    };
    $scope.highlight = text => {
      if (!$scope.filterBy) {
        return this.$sce.trustAsHtml(text);
      }
      return this.$sce.trustAsHtml(text.replace(new RegExp($scope.filterBy, 'i'), '<b>$&</b>'));
    };

    // initialize the component
    if ($scope.expanded) {
      $scope.collapseItemsList();
    } else {
      $scope.collapseItemsList();
    }
  }

}

