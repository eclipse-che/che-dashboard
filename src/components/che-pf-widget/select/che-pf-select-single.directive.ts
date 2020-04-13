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

import { ChePfSelectTypeahead } from './che-pf-select-typeahead.directive';

/**
 * @ngdoc directive
 *
 * @description defines a select component.
 *
 * @usage
 *   <che-pf-select-single
 *    config="ctrl.selectProperties.config"
 *    value="ctrl.selectProperties.value"
 *    on-select="ctrl.selectProperties.onSelect($value)"></che-pf-select-single>
 *
 * @author Oleksii Kurinnyi
 */
export class ChePfSelectSingle extends ChePfSelectTypeahead {

  templateUrl = 'components/che-pf-widget/select/che-pf-select-single.html';

  // IDs
  protected labelId = 'select-single-expanded-label';
  protected toggleId = 'select-single-expanded-toggle';

}

