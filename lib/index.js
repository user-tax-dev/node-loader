#!/usr/bin/env -S node --loader=@u6x/jsext --trace-uncaught --expose-gc --unhandled-rejections=strict --experimental-import-meta-resolve
var COMMONJS, baseURL, compile, getPackageType, not_coffee;

import jsext from '@u6x/jsext/jsext.js';

import {
  existsSync,
  readFileSync
} from 'fs';

import {
  // import { createRequire } from "module"
  dirname,
  normalize,
  extname,
  join,
  resolve as resolvePath
} from "path";

import {
  cwd
} from "process";

import {
  fileURLToPath,
  pathToFileURL
} from "url";

import CoffeeScript from "coffeescript";

import {
  coffee_plus
} from 'coffee_plus';

compile = coffee_plus(CoffeeScript);

baseURL = pathToFileURL(`${cwd}/`).href;

not_coffee = (specifier) => {
  return specifier.slice(specifier.lastIndexOf(".") + 1) !== 'coffee';
};

export const resolve = (specifier, context, defaultResolve) => {
  var file, fp, parentURL, prefix, ref;
  ({parentURL = baseURL} = context);
  if (not_coffee(specifier)) {
    $ : {
      while (true) {
        if (parentURL.startsWith('file://')) {
          ref = ['./', '../'];
          for (prefix of ref) {
            if (specifier.startsWith(prefix)) {
              file = specifier + '.coffee';
              fp = normalize(join(dirname(parentURL.slice(7)), file));
              if (existsSync(fp)) {
                specifier = fp;
                break $;
              }
            }
          }
        }
        return jsext(specifier, context, defaultResolve);
      }
    }
  }
  return {
    shortCircuit: true,
    url: new URL(specifier, parentURL).href
  };
};

COMMONJS = {
  format: 'commonjs',
  shortCircuit: true
};

export const load = async(url, context, defaultLoad) => {
  var format, rawSource, transformedSource;
  if (url.endsWith('.node')) {
    return COMMONJS;
  }
  if (not_coffee(url)) {
    return defaultLoad(url, context, defaultLoad);
  }
  format = getPackageType(fileURLToPath(url));
  if (format === "commonjs") {
    return COMMONJS;
  }
  ({
    source: rawSource
  } = (await defaultLoad(url, {format})));
  transformedSource = compile(rawSource.toString(), {
    bare: true,
    filename: url,
    inlineMap: true
  });
  return {
    format,
    shortCircuit: true,
    source: transformedSource
  };
};

getPackageType = (url) => {
  var dir, err, isFilePath, packagePath, type;
  isFilePath = ["js", "mjs", "coffee"].includes(extname(url).slice(1));
  dir = isFilePath ? dirname(url) : url;
  packagePath = resolvePath(dir, "package.json");
  try {
    ({type} = JSON.parse(readFileSync(packagePath, {
      encoding: "utf8"
    })));
  } catch (error) {
    err = error;
    if ((err != null ? err.code : void 0) !== "ENOENT") {
      console.error(err);
    }
  }
  if (type) {
    return type;
  }
  return dir.length > 1 && getPackageType(resolvePath(dir, ".."));
};
