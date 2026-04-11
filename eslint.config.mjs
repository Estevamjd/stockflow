import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts soltos da raiz e seeds rodam fora do app — não checar.
    "scripts/**",
    "prisma/full-setup.js",
  ]),

  // Ajustes finos do projeto.
  {
    rules: {
      // Convenção padrão: vars/args começando com `_` são intencionalmente
      // não usadas (handlers Next que precisam da assinatura mas ignoram o req).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
