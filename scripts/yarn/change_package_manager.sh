#!/bin/sh
#
# Copyright (c) 2021-2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

# The script is used to change current package manager(yarn 1 vs yarn 3)

export OLD_VERSION_DIR=$(PWD)/scripts/yarn/old_version
export TMP_DIR=$(PWD)/scripts/yarn/tmp

#==========================Clean temporary directory============================
if [ -d $TMP_DIR ]; then
    echo "[INFO]: Clean temporary directory"
    rm -rf $(PWD)/scripts/yarn/tmp
else
    echo "[INFO]: Create temporary directory"
fi
mkdir -p $TMP_DIR
#==========================Store origin files==================================
if [ -f "$(PWD)/.yarnrc.yml" ]; then
    echo "[INFO]: Move '.yarnrc.yml' file to the temporary directory"
    mv -f $(PWD)/.yarnrc.yml $TMP_DIR
fi

if [ -f "$(PWD)/.yarnrc" ]; then
    echo "[INFO]: Move '.yarnrc' file to the temporary directory"
    mv -f $(PWD)/.yarnrc $TMP_DIR
fi

if [ -d "$(PWD)/.yarn" ]; then
    echo "[INFO]: Move '.yarn' dir to the temporary directory"
    mv -f $(PWD)/.yarn $TMP_DIR/
fi

if [ -f "$(PWD)/yarn.lock" ]; then
    echo "[INFO]: Move 'yarn.lock' file to the temporary directory"
    mv -f $(PWD)/yarn.lock $TMP_DIR
fi

if [ -d "$(PWD)/.deps" ]; then
    echo "[INFO]: Move '.deps' dir to the temporary directory"
    mv -f $(PWD)/.deps $TMP_DIR/
fi
#==========================Restore old version=================================
if [ -d $OLD_VERSION_DIR ]; then
    echo "[INFO]: Restore old package manager version"
    mv -f $OLD_VERSION_DIR/{*,.*} $(PWD)/ > /dev/null 2>&1
fi
#==========================Cleanup=============================================
if [ -d $TMP_DIR ]; then
    echo "[INFO]: Cleanup"
    mv -f $TMP_DIR/{*,.*} $OLD_VERSION_DIR/ > /dev/null 2>&1
fi

VER=$(yarn --cwd $(PWD) -v | sed -e s/\\./\\n/g | sed -n 1p)

echo
echo "**********************"
echo "*****   Yarn $VER   *****"
echo "**********************"

exit 0
