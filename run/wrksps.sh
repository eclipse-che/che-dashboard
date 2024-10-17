#!/bin/bash
#
# Copyright (c) 2021-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

set -e

yarn workspace @eclipse-che/common "$@"
yarn workspace @eclipse-che/dashboard-frontend "$@"
yarn workspace @eclipse-che/dashboard-backend "$@"
