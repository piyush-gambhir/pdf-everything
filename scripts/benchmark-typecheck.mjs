import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = process.cwd();
const compilers = {
  ts6: resolve('backend/node_modules/typescript/bin/tsc6'),
  ts7: resolve('node_modules/typescript/bin/tsc'),
};
const projects = [
  'types',
  'backend',
  'console',
  'web',
  'workers/pdf-core-worker',
  'workers/pdf-worker',
];
const results = Object.fromEntries(projects.map((project) => [project, { ts6: [], ts7: [] }]));
for (let round = 0; round < 6; round++) {
  for (const project of projects) {
    for (const compiler of round % 2 ? ['ts7', 'ts6'] : ['ts6', 'ts7']) {
      const before = performance.now();
      const result = spawnSync(
        process.execPath,
        [compilers[compiler], '-p', 'tsconfig.json', '--noEmit', '--incremental', 'false'],
        { cwd: resolve(root, project), encoding: 'utf8' },
      );
      const ms = performance.now() - before;
      if (result.status !== 0)
        throw new Error(`${project} ${compiler}: ${result.stdout} ${result.stderr}`);
      if (round > 0) results[project][compiler].push(ms);
    }
  }
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = Object.fromEntries(
  Object.entries(results).map(([project, samples]) => [
    project,
    {
      ts6Ms: median(samples.ts6),
      ts7Ms: median(samples.ts7),
      speedup: median(samples.ts6) / median(samples.ts7),
    },
  ]),
);
console.log(
  JSON.stringify(
    {
      node: process.version,
      rounds: 5,
      warmupRounds: 1,
      mode: 'no emit, incremental disabled, alternating order, existing dependencies and generated files',
      samples: results,
      summary,
    },
    null,
    2,
  ),
);
