# wasmbind-example

This is an example C++ repo which shows how you can use wasmbind to target web API via wasm32-wasip2, wasmbind, emlite and webpack. 

Do note that using npm is not strictly necessary, however it simplifies bundling emlite and managing its version.

## Usage
```bash
git clone https://github.com/emlite/wasmbind-wasip2-example
cd wasmbind-wasip2-example
npm i
npm run cmake:config
npm run cmake:build
npm run jco:app
npm run pack
npm run serve
```

The contents of these commands can be found in the package.json scripts entry.

