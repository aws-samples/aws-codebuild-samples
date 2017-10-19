#!/bin/bash

set -ev

# Set up git client
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true
git config --global user.name "Shrinkwrapper Bot"
git config --global user.email shrinkwrapper@example.com
git config --global push.default simple

if [ -e npm-shrinkwrap.json ]
then
    rm npm-shrinkwrap.json
fi

npm install
npm test
npm shrinkwrap --dev

if [ -n "$(git status --porcelain)" ]; then
    git add npm-shrinkwrap.json
    git commit -m "Update npm dependencies"
    git push origin HEAD:master
else
    echo "No dependency updates!"
fi
