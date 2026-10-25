import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores([
        "**/dist/**",
        "**/coverage/**",
        "src-tauri/target/**",
        "src-tauri/gen/**",
    ]),
    {
        files: ["**/*.{js,jsx,mjs,cjs}"],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: "latest",
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
            "@stylistic/indent": ["error", 4, { SwitchCase: 1 }],
        },
    },
    {
        files: ["src/**/*.{js,jsx,mjs}"],
        extends: [reactRefresh.configs.vite],
        languageOptions: {
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
    },
    {
        files: [
            "**/*.config.{js,mjs,cjs}",
            "**/*.cjs",
            "scripts/**/*.{js,mjs}",
            "src/utils/assign-aliases.js",
            "src/utils/assign-roles.js",
        ],
        languageOptions: {
            globals: globals.node,
        },
    },
]);