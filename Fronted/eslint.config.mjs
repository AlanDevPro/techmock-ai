import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([

  ...nextVitals,
  ...nextTs,

  // ─────────────────────────────────────────────
  // REGLAS PERSONALIZADAS
  // ─────────────────────────────────────────────

  {
    rules: {

      // Permite fetch + setState dentro de useEffect
      // sin warnings innecesarios en dashboards/APIs
      "react-hooks/set-state-in-effect": "off",

    },
  },

  // ─────────────────────────────────────────────
  // IGNORE FILES
  // ─────────────────────────────────────────────

  globalIgnores([

    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

  ]),
]);

export default eslintConfig;