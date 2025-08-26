import { makeHost } from "./adapter.js";
import { instantiate as initApp } from "./app/main.js";

import * as cliMod    from "./shim/preview2-shim/lib/browser/cli.js";
import * as ioMod     from "./shim/preview2-shim/lib/browser/io.js";
import * as clocksMod from "./shim/preview2-shim/lib/browser/clocks.js";
import * as randMod   from "./shim/preview2-shim/lib/browser/random.js";
import * as fsMod     from "./shim/preview2-shim/lib/browser/filesystem.js";
import * as httpMod   from "./shim/preview2-shim/lib/browser/http.js";

const getAppCore = (p) =>
  WebAssembly.compileStreaming(fetch(new URL(`./app/${p}`, import.meta.url)));

async function inst(init, imports, getCore) {
  try { return await init(getCore, imports); }
  catch { return await init(imports, getCore); }
}

function buildWasiImports() {
  const cli = cliMod, io = ioMod, clocks = clocksMod, random = randMod, fs = fsMod, http = httpMod;
  return {
    // wasi:cli/*
    "wasi:cli/environment": cli.environment,
    "wasi:cli/exit":        cli.exit,
    "wasi:cli/stdin":       cli.stdin,
    "wasi:cli/stdout":      cli.stdout,
    "wasi:cli/stderr":      cli.stderr,
    "wasi:cli/terminal-input":  cli.terminalInput,
    "wasi:cli/terminal-output": cli.terminalOutput,
    "wasi:cli/terminal-stdin":  cli.terminalStdin,
    "wasi:cli/terminal-stdout": cli.terminalStdout,
    "wasi:cli/terminal-stderr": cli.terminalStderr,

    // wasi:io/*
    "wasi:io/streams": io.streams,
    "wasi:io/error":   io.error,
    "wasi:io/poll":    io.poll,

    // wasi:clocks/*
    "wasi:clocks/monotonic-clock":
      clocks.monotonicClock,
    "wasi:clocks/wall-clock":
      clocks.wallClock,

    // wasi:random/*
    "wasi:random/random": random.random,

    // wasi:filesystem/*
    "wasi:filesystem/preopens":   fs.preopens,
    "wasi:filesystem/filesystem": fs.filesystem,
    "wasi:filesystem/types":      fs.types,
    "wasi:filesystem/descriptor": fs.descriptor,

    // wasi:http/*
    "wasi:http/types":            http.types,
    "wasi:http/fields":           http.fields,
    "wasi:http/error":            http.error,
    "wasi:http/outgoing-handler": http.outgoingHandler,
    "wasi:http/incoming-handler": http.incomingHandler,
    "wasi:http/outgoing-body":    http.outgoingBody,
    "wasi:http/incoming-body":    http.incomingBody,
  };
}

export default async function init() {
  const wasi = buildWasiImports();

  let trampoline = null;
  const dyncall = {
    apply(fidx, argv, data) {
      if (!trampoline) throw new Error("dyncall.apply");
      return trampoline(fidx, argv, data);
    },
  };

  const host = makeHost({ apply: dyncall.apply });

  const app = await inst(
    initApp,
    {
      ...wasi,
      "emlite:env/host": host,
      "emlite:env/host@0.1.0": host,
      "emlite:env/dyncall": dyncall,
      "emlite:env/dyncall@0.1.0": dyncall,
    },
    getAppCore
  );

  const exported =
    app.exports?.emlite_env_dyncall_apply ||
    app["emlite:env/dyncall"]?.apply ||
    app["emlite:env/dyncall@0.1.0"]?.apply;

  if (!exported) {
    throw new Error(
      "App does not export a dyncall trampoline. " +
      "Ensure your C++ build enables emlite dyncall export " +
      "(e.g., link the emlite support that defines `emlite_env_dyncall_apply`)."
    );
  }

  trampoline = exported;

  return app;
}
