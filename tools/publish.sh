#!/bin/bash
set -x
npm run b:all

cd packages
cd arche-engine
npm publish --access public
cd ..

cd controls
npm publish --access public
cd ..

cd core
npm publish --access public
cd ..

cd loader
npm publish --access public
cd ..

cd math
npm publish --access public
cd ..

cd physics-physx
npm publish --access public
cd ..

cd physics-physx-debug
npm publish --access public
cd ..

cd design
npm publish --access public
cd ..

set +x
