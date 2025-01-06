# node-webgpu - dawn.node

Provides webgpu to node

[Dawn](https://dawn.googlesource.com/dawn) is an implementation of [WebGPU](https://gpuweb.github.io/gpuweb/).
It includes a node plugin and this repo builds that plugin and publishes
it on npm.

## Usage

```
npm install --save node-webgpu
```

Then in your code

```js
import { create, globals } from 'node-webgpu';

Object.assign(globalThis, globals);
globalThis.navigator = { gpu: create([]) };

...

// do some webgpu
const device = await(await navigator.gpu.requestAdapter()).requestDevice();
...
```

see [example](https://github.com/greggman/node-webgpu/tree/main/example)

You can pass dawn options in `create`

```js
let navigator = {
  gpu: create([
    "enable-dawn-features=allow_unsafe_apis,dump_shaders,disable_symbol_renaming",
  ]),
};
```

There is both `enable-dawn-features=comma,separated,toggles` and `disable-dawn-features=comma,separated,toggles`.

The available options are listed [here](https://dawn.googlesource.com/dawn/+/refs/heads/chromium-gpu-experimental/src/dawn_native/Toggles.cpp)

## Notes

This package provides a WebGPU implementation it node. That said, if you are making a webpage
and are considering using this for testing, you'd probably be better off using puppeteer. You can
find an example of using puppeteer for testing WebGPU in [this repo](https://github.com/greggman/webgpu-debug-helper).

This package is for WebGPU in node. It provides WebGPU in node. But, it does not not provide integration
with the web platform. For example, importing video via `HTMLVideoElement` or `VideoFrame`. It doesn't
provide a way to copy an `HTMLImageElement` to a texture. It also doesn't provide a way to render to an
`HTMLCanvasElement`. All of those only exist in the browser, not in node.

I suspect you could provide many of those with polyfills without changing this repo but I have not
looked into it.

What you can do is render to textures and then read them back. You can also run compute shaders
and read their results.

## Bugs

## Updating

This updates to the latest dawn and depot_tools

```sh
npm ci
npm run update
```

## Building on all supported platforms

Push a new version. Check the github actions. You should see build artifacts
added to the bottom of the latest action run. 

## Building

This builds for the local OS (win64,macOS-intel,macOS-arm,linux)

```sh
npm ci
npm run build
```

### Prerequisites

#### Windows

Before running the build script above you must have
Visual Studio C++ installed and have run the `vcvars64.bat` file.
I've tested with Visual Studio Community Edition 2022

Further you must have [cmake installed](https://cmake.org/download/)
and either in your path or at it's standard place of `C:\Program Files\CMake`

You must have `go` installed. Get it at https://go.dev/

And you must have `node.js` installed, at least version 18. 
I recommend using [nvm-windows](https://github.com/coreybutler/nvm-windows) to install it
as it makes it easy to switch version

#### MacOS

Before running the build script above you must have
XCode installed and its command line tools

Further you must have [cmake installed](https://cmake.org/download/)
and either in your path or at it's standard place of `/Applications/CMake.app`

You must have `go` installed. Get it at https://go.dev/

And you must have `node.js` installed, at least version 18. 
I recommend using [nvm](https://github.com/nvm-sh/nvm) to install it
as it makes it easy to switch versions.

#### Linux (Ubuntu)

Before running the build script above you need to install
the following dependencies

```sh
sudo apt-get install cmake libxrandr-dev libxinerama-dev libxcursor-dev mesa-common-dev libx11-xcb-dev pkg-config nodejs npm
```

You must have `go` installed. Get it at https://go.dev/

And you must have `node.js` installed, at least version 18. 
I recommend using [nvm](https://github.com/nvm-sh/nvm) to install it
as it makes it easy to switch versions.

## License

MIT: https://dawn.googlesource.com/dawn/+/HEAD/LICENSE
