const fs = require("fs");
const path = require("path");

import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import glslify from "rollup-plugin-glslify";
import { terser } from "rollup-plugin-terser";
import serve from "rollup-plugin-serve";
import replace from "@rollup/plugin-replace";

const camelCase = require("camelcase");

const { BUILD_TYPE, NODE_ENV } = process.env;

const pkgsRoot = path.join(__dirname, "packages");
const pkgs = fs
  .readdirSync(pkgsRoot)
  .filter((dir) => dir !== "design")
  .map((dir) => path.join(pkgsRoot, dir))
  .filter((dir) => fs.statSync(dir).isDirectory())
  .map((location) => {
    return {
      location: location,
      pkgJson: require(path.resolve(location, "package.json"))
    };
  });

// "archeEngine" 、 "@archeEngine/controls" ...
function toGlobalName(pkgName) {
  return camelCase(pkgName);
}

const extensions = [".js", ".jsx", ".ts", ".tsx"];
const mainFields = NODE_ENV === "development" ? ["debug", "module", "main"] : undefined;

const commonPlugins = [
  resolve({ extensions, preferBuiltins: true, mainFields }),
  glslify({
    include: [/\.glsl$/]
  }),
  babel({
    extensions,
    babelHelpers: "bundled",
    exclude: ["node_modules/**", "packages/**/node_modules/**"]
  }),
  commonjs(),
  NODE_ENV === "development"
    ? serve({
        contentBase: "packages",
        port: 9999
      })
    : null
];

function config({ location, pkgJson }) {
  const input = path.join(location, "src", "index.ts");
  const dependencies = Object.assign({}, pkgJson.dependencies ?? {}, pkgJson.peerDependencies ?? {});
  const external = Object.keys(dependencies);
  const name = pkgJson.name;
  commonPlugins.push(
    replace({
      preventAssignment: true,
      __buildVersion: pkgJson.version
    })
  );

  return {
    umd: (compress) => {
      let file = path.join(location, "dist", "browser.js");
      const plugins = [...commonPlugins];
      if (compress) {
        plugins.push(terser());
        file = path.join(location, "dist", "browser.min.js");
      }

      const globalName = toGlobalName(pkgJson.name);

      const globals = {};
      external.forEach((pkgName) => {
        globals[pkgName] = toGlobalName(pkgName);
      });

      return {
        input,
        external: name === "arche-engine" ? {} : external,
        output: [
          {
            file,
            name: globalName,
            format: "umd",
            sourcemap: false,
            globals
          }
        ],
        plugins
      };
    },
    module: () => {
      const plugins = [...commonPlugins];
      return {
        input,
        external,
        output: [
          {
            file: path.join(location, pkgJson.module),
            format: "es",
            sourcemap: true
          },
          {
            file: path.join(location, pkgJson.main),
            sourcemap: true,
            format: "commonjs"
          }
        ],
        plugins
      };
    }
  };
}

async function makeRollupConfig({ type, compress = true, visualizer = true, ..._ }) {
  return config({ ..._ })[type](compress, visualizer);
}

let promises = [];

switch (BUILD_TYPE) {
  case "UMD":
    promises.push(...getUMD());
    break;
  case "MODULE":
    promises.push(...getModule());
    break;
  case "ALL":
    promises.push(...getAll());
    break;
  default:
    break;
}

function getUMD() {
  const configs = pkgs.filter((pkg) => pkg.pkgJson.browser);
  return configs
    .map((config) => makeRollupConfig({ ...config, type: "umd" }))
    .concat(
      configs.map((config) =>
        makeRollupConfig({
          ...config,
          type: "umd",
          compress: false,
          visualizer: false
        })
      )
    );
}

function getModule() {
  const configs = [...pkgs];
  return configs.map((config) => makeRollupConfig({ ...config, type: "module" }));
}

function getAll() {
  return [...getModule(), ...getUMD()];
}

export default Promise.all(promises);
