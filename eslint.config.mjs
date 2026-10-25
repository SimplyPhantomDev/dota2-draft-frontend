import stylistic from "@stylistic/eslint-plugin";

export default [
    { ignores: ["node_modules/", "dist/"] },
    {
        files: ["**/*.{js,cjs,mjs, jsx}"],
        plugins: { "@stylistic": stylistic },
        rules: {
            "@stylistic/indent": ["error", 4],
        },
    },
];