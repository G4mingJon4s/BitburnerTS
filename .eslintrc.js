module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: ["eslint:recommended"],
	overrides: [
		{
			files: ["*.ts", "*.tsx"],
			extends: [
				"plugin:@typescript-eslint/recommended",
				"plugin:@typescript-eslint/recommended-requiring-type-checking",
			],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint"],
			parserOptions: {
				project: ["./tsconfig.json"],
			},
			rules: {
				"@typescript-eslint/require-await": ["off"],
				"@typescript-eslint/no-use-before-define": ["error", { "typedefs": false,
					"enums": false,
					"functions": false, }],
				"no-use-before-define": ["off"],
			},
		}
	],
	plugins: ["@typescript-eslint"],
	ignorePatterns: [
		"node_modules/**",
		"build/**",
		"dist/**",
		"NetscriptDefinitions.d.ts"
	],
	rules: {
		"no-multi-spaces": ["error"],
		quotes: ["error", "double"],
		semi: ["error", "always"],
		indent: ["error", "tab"],
		eqeqeq: ["warn"],
		camelcase: ["error"],
		"no-fallthrough": ["warn"],
		"no-unused-vars": ["warn"],
		"no-constant-condition": ["off"],
		"no-case-declarations": ["off"],
		"no-constructor-return": ["error"],
		"no-dupe-else-if": ["error"],
		"no-inner-declarations": ["warn"],
		"no-this-before-super": ["error"],
		"no-unmodified-loop-condition": ["warn"],
		"no-unreachable-loop": ["warn"],
		"no-use-before-define": ["error", { functions: false,
			classes: false }],
		"arrow-body-style": ["error", "as-needed"],
		"block-scoped-var": ["error"],
		"no-multiple-empty-lines": ["error", { max: 1 }],
		"object-curly-spacing": ["error", "always"],
		"object-property-newline": ["error"],
	},
};
