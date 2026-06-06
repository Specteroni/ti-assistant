#!/usr/bin/env node

require("./test-register");

const fs = require("node:fs");
const path = require("node:path");

const tests = [];

global.test = function test(name, fn) {
  tests.push({ name, fn });
};

function findTests(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findTests(fullPath);
    }
    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      return [fullPath];
    }
    return [];
  });
}

for (const file of findTests(path.join(process.cwd(), "test"))) {
  require(file);
}

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      failed++;
      console.error(`not ok - ${name}`);
      console.error(error);
    }
  }

  console.log(`\n${tests.length - failed}/${tests.length} tests passed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
})();
