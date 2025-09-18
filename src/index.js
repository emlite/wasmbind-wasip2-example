import { Emlite } from "emlite";
import { makeHost } from "emlite/wasip2adapter";
import { instantiate as initApp } from "../bin/app/main.js";
import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";

async function instantiateApp() {
  const getAppCore = (p) =>
    WebAssembly.compileStreaming(
      fetch(new URL(`../bin/app/${p}`, import.meta.url))
    );

  const wasiShim = new WASIShim({
    // optional:
    // args: [],
    // env: {},
    // preopens: {}, // browser FS
  });
  const wasi = wasiShim.getImportObject();

  const emlite = new Emlite();

  let applyImpl = () => {
    throw new Error("dyncall.apply not wired yet");
  };
  let targetImpl = () => -1;

  const host = makeHost({ emlite, apply: (...args) => applyImpl(...args), target: () => targetImpl() });

  const app = await initApp(getAppCore, {
    ...wasi,
    "emlite:env/host": host,
  });


  applyImpl = app["emlite:env/dyncall@0.1.0"]?.apply;

  targetImpl = app["emlite:env/dyncall@0.1.0"]?.emliteTarget;
  console.log(app);
  return app;
}

async function main() {
  const app = await instantiateApp();
  app.iface.start([]);
}

await main();