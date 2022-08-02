#!/bin/sh
#
# Copyright (c) 2021 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

set -a

if [ ! -z "$CHE_INFRA_KUBERNETES_PORT" ]
then
    KUBERNETES_PORT=$CHE_INFRA_KUBERNETES_PORT
fi

if [ ! -z "$CHE_INFRA_KUBERNETES_PORT_443_TCP_ADDR" ]
then
    KUBERNETES_PORT_443_TCP_ADDR=$CHE_INFRA_KUBERNETES_PORT_443_TCP_ADDR
fi

if [ ! -z "$CHE_INFRA_KUBERNETES_PORT_443_TCP" ]
then
    KUBERNETES_PORT_443_TCP=$CHE_INFRA_KUBERNETES_PORT_443_TCP
fi

if [ ! -z "$CHE_INFRA_KUBERNETES_SERVICE_HOST" ]
then
    KUBERNETES_SERVICE_HOST=$CHE_INFRA_KUBERNETES_SERVICE_HOST
fi

set +a

set -e
echo 'Starting Dashboard backend server...'
start_server="node /backend/server/backend.js --publicFolder /public"
$start_server &
wait
echo 'Dashboard backend server is stopped.'
