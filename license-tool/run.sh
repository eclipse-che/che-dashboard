#!/bin/sh
set -e
set -u

if [ ! -d ${PWD}/.deps ]; then
    mkdir ${PWD}/.deps
fi

if [ ! -d ${PWD}/.deps/tmp ]; then
    mkdir ${PWD}/.deps/tmp
fi

# clean up old DEPENDENCIES to make sure that the out-dated version is not used
rm -f ${PWD}/.deps/tmp/DEPENDENCIES
touch ${PWD}/.deps/tmp/DEPENDENCIES
chmod 666 ${PWD}/.deps/tmp/DEPENDENCIES

docker run --rm -t -v ${PWD}/yarn.lock:/workspace/yarn.lock  \
       -v ${PWD}/package.json:/workspace/package.json  \
       -v ${PWD}/.deps:/workspace/.deps  \
       -v ${PWD}/.deps/tmp/DEPENDENCIES:/workspace/DEPENDENCIES \
       nodejs-license-tool:next
