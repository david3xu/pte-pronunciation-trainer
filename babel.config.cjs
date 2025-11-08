/**
 * Babel Configuration for Jest
 *
 * Enables ES6 module transpilation for testing
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
};
