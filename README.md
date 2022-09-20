# Arche.js

This project is a part of its WebGPU development, if you want to know about the implementation of Native
WebGPU ([Dawn](https://dawn.googlesource.com/dawn))
Engine, please refer to [Arche-cpp](https://github.com/ArcheGraphics/Arche-cpp). This repository is designed to
adapt the [Oasis engine](https://github.com/oasis-engine/engine) to [WebGPU](https://github.com/gpuweb/types), and is
currently mainly adapted to the [Canary version of Chrome](https://www.google.com/intl/zh-CN/chrome/canary/).

## Cloning && Install

This repository contains submodules for external dependencies, so when doing a fresh clone you need to clone
recursively:

```shell
git clone https://github.com/ArcheGraphics/Arche.js.git && cd Arche.js
pnpm install && npm run boostrap
```

## Build

Prerequisites:

- [Node.js v15.0.0+](https://nodejs.org/en/) and NPM (Install by official website)
- [PNPM](https://pnpm.io/) (Install globally by `npm install -g pnpm`)

In the folder where you have cloned the repository, install the build dependencies using pnpm:

```sh
pnpm install
```

Then, to build the source, using npm:

```sh
npm run b:all
```


## Progress

The project is managed by using issues, they are all gather
into [milestone](https://github.com/yangfengzzz/Oasis-WebGPU/milestones).
