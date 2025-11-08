module.exports = {
  extends: 'stylelint-config-standard',
  rules: {
    // Allow BEM naming convention (double underscores and dashes)
    'selector-class-pattern': null,
    'keyframes-name-pattern': null,

    // Allow rgba() notation (more common than rgb() with alpha)
    'color-function-alias-notation': null,
    'color-function-notation': null,
    'alpha-value-notation': null,

    // Allow short and long hex colors
    'color-hex-length': null,

    // Allow break-word (still widely used)
    'declaration-property-value-keyword-no-deprecated': null,

    // Allow duplicate selectors (sometimes intentional for specificity)
    'no-duplicate-selectors': null,

    // Allow prefers-contrast: high (supported in modern browsers)
    'media-feature-name-value-no-unknown': null,

    // Allow flexible comment spacing
    'comment-empty-line-before': null,

    // Disable indentation rule if causing issues
    'indentation': null,

    // Disable string-quotes rule if causing issues
    'string-quotes': null
  }
};
