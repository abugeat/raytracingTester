import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  { 
    input: 'raytracingtester.js',
    output: [
      {
        format: 'esm',
        file: 'raytracingtesterBundle.js'
      },
    ],

    plugins: [
      resolve(),
      commonjs(),
    ]
  },
  {
    input: 'raytracingWorker.js',
    output: [
      {
        format: 'esm',
        file: 'raytracingWorkerBundle.js'
      },
    ],

    plugins: [
      resolve(),
      commonjs(),
    ]
  }
];