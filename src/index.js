import { makeHost } from "emlite/wasip2adapter";
import { instantiate as initApp } from "../bin/app/main.js";

import * as cliMod from "@bytecodealliance/preview2-shim/cli";
import * as ioMod from "@bytecodealliance/preview2-shim/io";
import * as clocksMod from "@bytecodealliance/preview2-shim/clocks";
import * as randMod from "@bytecodealliance/preview2-shim/random";
import * as fsMod from "@bytecodealliance/preview2-shim/filesystem";
import * as httpMod from "@bytecodealliance/preview2-shim/http";

const getAppCore = (p) =>
  WebAssembly.compileStreaming(
    fetch(new URL(`../bin/app/${p}`, import.meta.url))
  );

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

async function instantiateApp() {
  const wasi = buildWasiImports();

  // 1) Provide a placeholder; adapter will call this for callbacks.
  let applyImpl = () => {
    throw new Error("dyncall.apply not wired yet");
  };

  // 2) Build the host, injecting a delegating apply
  const host = makeHost({ apply: (...args) => applyImpl(...args) });

  // 3) Instantiate the app (no dyncall import needed)
  const app = await initApp(getAppCore, {
    ...wasi,
    "emlite:env/host": host,
    "emlite:env/host@0.1.0": host,
  });

  // 4) Wire the host’s apply to the app’s exported trampoline
  const exported =
    app["emlite:env/dyncall@0.1.0"]?.apply ||
    app["emlite:env/dyncall"]?.apply;

  if (!exported) {
    throw new Error("Guest didn’t export emlite:env/dyncall.apply");
  }
  applyImpl = exported;

  return app;
}

let app = await instantiateApp();
app.iface.start([]);
