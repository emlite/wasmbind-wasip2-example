import { makeHost } from "emlite/wasip2adapter";
import { instantiate as initApp } from "../dist/app/main.js";

import * as cliMod from "@bytecodealliance/preview2-shim/cli";
import * as ioMod from "@bytecodealliance/preview2-shim/io";
import * as clocksMod from "@bytecodealliance/preview2-shim/clocks";
import * as randMod from "@bytecodealliance/preview2-shim/random";
import * as fsMod from "@bytecodealliance/preview2-shim/filesystem";
import * as httpMod from "@bytecodealliance/preview2-shim/http";

const getAppCore = (p) =>
  WebAssembly.compileStreaming(
    fetch(new URL(`../dist/app/${p}`, import.meta.url))
  );

async function inst(init, imports, getCore) {
  return await init(getCore, imports);
}

function buildWasiImports() {
  const cli = cliMod,
    io = ioMod,
    clocks = clocksMod,
    random = randMod,
    fs = fsMod,
    http = httpMod;
  return {
    // wasi:cli/*
    "wasi:cli/environment": cli.environment,
    "wasi:cli/exit": cli.exit,
    "wasi:cli/stdin": cli.stdin,
    "wasi:cli/stdout": cli.stdout,
    "wasi:cli/stderr": cli.stderr,
    "wasi:cli/terminal-input": cli.terminalInput,
    "wasi:cli/terminal-output": cli.terminalOutput,
    "wasi:cli/terminal-stdin": cli.terminalStdin,
    "wasi:cli/terminal-stdout": cli.terminalStdout,
    "wasi:cli/terminal-stderr": cli.terminalStderr,

    // wasi:io/*
    "wasi:io/streams": io.streams,
    "wasi:io/error": io.error,
    "wasi:io/poll": io.poll,

    // wasi:clocks/*
    "wasi:clocks/monotonic-clock": clocks.monotonicClock,
    "wasi:clocks/wall-clock": clocks.wallClock,

    // wasi:random/*
    "wasi:random/random": random.random,

    // wasi:filesystem/*
    "wasi:filesystem/preopens": fs.preopens,
    "wasi:filesystem/filesystem": fs.filesystem,
    "wasi:filesystem/types": fs.types,
    "wasi:filesystem/descriptor": fs.descriptor,

    // wasi:http/*
    "wasi:http/types": http.types,
    "wasi:http/fields": http.fields,
    "wasi:http/error": http.error,
    "wasi:http/outgoing-handler": http.outgoingHandler,
    "wasi:http/incoming-handler": http.incomingHandler,
    "wasi:http/outgoing-body": http.outgoingBody,
    "wasi:http/incoming-body": http.incomingBody,
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

let app = await init();
app.iface.start([]);
