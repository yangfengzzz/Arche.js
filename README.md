# Oasis-WebGPU

This project is a part of its WebGPU development, if you want to know about the implementation of Native
WebGPU ([Dawn](https://dawn.googlesource.com/dawn))
Engine, please refer to [DigitalArche](https://github.com/yangfengzzz/DigitalArche). This repository is designed to
adapt the [Oasis engine](https://github.com/oasis-engine/engine) to [WebGPU](https://github.com/gpuweb/types), and is
currently mainly adapted to the [Canary version of Chrome](https://www.google.com/intl/zh-CN/chrome/canary/).

## Cloning && Install

This repository contains submodules for external dependencies, so when doing a fresh clone you need to clone
recursively:

```shell
git clone --recursive https://github.com/yangfengzzz/Oasis-WebGPU.git
```

Existing repositories can be updated manually:

```shell
git submodule init
git submodule update
```

```shell
npm run install
```

## Run

All resources are in assets folder. you can use ```anywhere``` to start a server.

```shell
npm i anywhere -g
cd assets
anywhere
```

Then the assets address should be modified according to your env. you can modify the IP in app. And Finally:

```shell
npm run dev
```

## Progress

The project is managed by using issues, they are all gather
into [milestone](https://github.com/yangfengzzz/Oasis-WebGPU/milestones).
