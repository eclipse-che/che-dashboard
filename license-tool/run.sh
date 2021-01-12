#!/bin/sh
set -e
set -u

if [ ! -d ${PWD}/.deps ]; then
    mkdir ${PWD}/.deps
fi

if [ ! -d ${PWD}/.deps/tmp ]; then
    mkdir ${PWD}/.deps/tmp
fi

if [ ! -f ${PWD}/.deps/tmp/DEPENDENCIES ]; then
    touch ${PWD}/.deps/tmp/DEPENDENCIES
    chmod 666 ${PWD}/.deps/tmp/DEPENDENCIES
fi

docker run --rm -t -v ${PWD}/yarn.lock:/workspace/yarn.lock  \
       -v ${PWD}/package.json:/workspace/package.json  \
       -v ${PWD}/.deps:/workspace/.deps  \
       -v ${PWD}/.deps/tmp/DEPENDENCIES:/workspace/DEPENDENCIES \
       nodejs-license-tool:next
