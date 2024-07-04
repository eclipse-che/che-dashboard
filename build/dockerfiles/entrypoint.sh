#!/bin/sh
#
# Copyright (c) 2021-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

set -e
echo 'Updating index.jsonv...'
sed -i 's|CHECLUSTER_CR_NAMESPACE|'${CHECLUSTER_CR_NAMESPACE}'|g' "/public/dashboard/devfile-registry/devfiles/index.json"
echo 'Starting Dashboard backend server...'
start_server="node /backend/server/backend.js --publicFolder /public"
$start_server &
wait
echo 'Dashboard backend server is stopped.'
