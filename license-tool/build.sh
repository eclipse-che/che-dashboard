#!/bin/sh
set -e
set -u

docker build -f ${PWD}/license-tool/licenseTool.Dockerfile -t nodejs-license-tool:next .
