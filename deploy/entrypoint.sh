#!/bin/sh
# Bootstrap (clone/maj des repos suivis ayant un gitUrl) puis lance le CLI.
set -e
node /app/bin/cohabit.mjs bootstrap
exec node /app/bin/cohabit.mjs "$@"
