import nx from '@nx/eslint-plugin';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const workspace = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const packageNames = workspace.workspaces.map((root) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, root, 'package.json'))).name,
);
const publicNames = packageNames.map((name) =>
  name.slice('@quiron/'.length).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
);
const processLoaders = ['mainModule', 'getBuiltinModule', 'binding', '_linkedBinding', 'dlopen'];
const projectRoots = [...workspace.workspaces, 'apps/api', 'apps/web'];
const testFiles = projectRoots.map((root) => `${root}/test/**/*.{js,mjs,cjs,jsx}`);
const publicImportPatterns = [{
  regex: `^@quiron/(?!(?:${publicNames.join('|')})$)`,
  message: 'Use a declared workspace package public root; deep and unknown imports are forbidden.',
}, {
  regex: '^(?:/|[A-Za-z]:|file:|(?:apps|modules|packages|dist|node_modules)/)',
  message: 'Absolute filesystem and file-URL imports are forbidden; use a public package root.',
}];
const fixtureConsumer = 'apps/api/test/library-consumption.test.mjs';
const fixtureImport = '../../../dist/test-fixtures/api/consume-libraries.js';

// Nx already rejects external relative paths. Close only the demonstrated
// same-project artifact/test-tooling gaps, using lexical containment, not resolution.
const relativeImportPolicy = {
  meta: {
    type: 'problem', schema: [],
    messages: {
      artifact: 'Do not import generated output or node_modules by filesystem path.',
      tooling: 'Production files cannot import the project test tooling directory.',
    },
  },
  create(context) {
    const source = path.relative(import.meta.dirname, context.filename);
    const root = projectRoots.find((candidate) => source.startsWith(candidate + path.sep));
    if (!root) return {};
    const testRoot = path.join(import.meta.dirname, root, 'test') + path.sep;
    const isTest = context.filename.startsWith(testRoot);
    const check = (node) => {
      const specifier = node?.value;
      if (typeof specifier !== 'string' || !/^\.\.?\//.test(specifier)) return;
      const target = path.resolve(path.dirname(context.filename), specifier);
      const fixture = source === fixtureConsumer && specifier === fixtureImport;
      if (!fixture && path.relative(import.meta.dirname, target).split(path.sep).some((part) => ['dist', 'node_modules'].includes(part))) {
        context.report({ node, messageId: 'artifact' });
      } else if (!isTest && (target === testRoot.slice(0, -1) || target.startsWith(testRoot))) {
        context.report({ node, messageId: 'tooling' });
      }
    };
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      CallExpression: (node) => { if (node.callee.type === 'Identifier' && node.callee.name === 'require') check(node.arguments[0]); },
    };
  },
};

function staticallyNamed(key, computed) {
  return !computed ||
    (key.type === 'Literal' && ['string', 'number'].includes(typeof key.value)) ||
    (key.type === 'TemplateLiteral' && key.expressions.length === 0);
}

// Native property rules reject known loader names, but cannot follow a copied
// process/global object or resolve opaque computed keys. Reject only those uses
// of actual ambient bindings; unrelated local data and normal env reads stay legal.
const staticRuntimeAccess = {
  meta: {
    type: 'problem', schema: [],
    messages: { opaque: 'Use statically named runtime properties; do not copy or dynamically index process/global objects.' },
  },
  create(context) {
    return {
      Program(node) {
        const scope = context.sourceCode.getScope(node);
        const names = new Set(['process', 'globalThis', 'global']);
        const references = new Set(scope.through.filter((ref) => names.has(ref.identifier.name)));
        for (const variable of scope.variables) {
          if (!variable.defs.length && names.has(variable.name)) {
            for (const reference of variable.references) references.add(reference);
          }
        }
        for (const reference of references) {
          const identifier = reference.identifier;
          let typeContext = identifier.parent;
          while (typeContext?.type === 'TSQualifiedName') typeContext = typeContext.parent;
          if ((reference.isTypeReference && !reference.isValueReference) || typeContext?.type === 'TSTypeQuery') continue;
          const parent = identifier.parent;
          const member = parent.type === 'MemberExpression' && parent.object === identifier && staticallyNamed(parent.property, parent.computed);
          const pattern = parent.type === 'VariableDeclarator' && parent.init === identifier ? parent.id :
            parent.type === 'AssignmentExpression' && parent.right === identifier ? parent.left : null;
          const destructure = pattern?.type === 'ObjectPattern' && pattern.properties.every((property) =>
            property.type === 'Property' && staticallyNamed(property.key, property.computed));
          const typeOf = parent.type === 'UnaryExpression' && parent.operator === 'typeof';
          if (!member && !destructure && !typeOf) context.report({ node: identifier, messageId: 'opaque' });
        }
      },
    };
  },
};

// Nx 22 returns an empty listener when its graph is unavailable. Keep native
// enforcement, but make that documented skip an error instead of a green lint.
const nativeBoundaryRule = nx.rules['enforce-module-boundaries'];
const failClosedNx = {
  ...nx,
  rules: {
    ...nx.rules,
    'enforce-module-boundaries': {
      ...nativeBoundaryRule,
      create(context) {
        const listeners = nativeBoundaryRule.create(context);
        return Object.keys(listeners).length ? listeners : {
          Program(node) {
            context.report({ node, message: 'Nx project graph unavailable: run npm run check:projects before standalone ESLint.' });
          },
        };
      },
    },
  },
};

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  URL: 'readonly',
  global: 'readonly',
  structuredClone: 'readonly',
};

const config = [
  {
    ignores: [
      '**/dist/**',
      'coverage/**',
      'reports/**',
      'node_modules/**',
      '.nx/**',
    ],
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: nodeGlobals },
  },
  {
    basePath: import.meta.dirname,
    files: ['tools/**/*.mjs', 'eslint.config.mjs'],
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'valid-typeof': 'error',
      'no-async-promise-executor': 'error',
    },
  },
  {
    basePath: import.meta.dirname,
    files: ['**/*.{ts,tsx}', '{apps,modules,packages}/**/*.{js,mjs,cjs,jsx}'],
    ignores: ['**/eslint.config.{js,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      globals: nodeGlobals,
    },
    plugins: {
      '@nx': failClosedNx,
      '@typescript-eslint': tseslint,
      qcrm: { rules: { 'static-runtime-access': staticRuntimeAccess, 'relative-import-policy': relativeImportPolicy } },
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'layer:module',
              onlyDependOnLibsWithTags: ['layer:infrastructure'],
            },
            {
              sourceTag: 'layer:infrastructure',
              onlyDependOnLibsWithTags: ['layer:infrastructure'],
            },
            {
              sourceTag: 'layer:app',
              onlyDependOnLibsWithTags: ['layer:module', 'layer:infrastructure'],
            },
          ],
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'qcrm/relative-import-policy': 'error',
      'qcrm/static-runtime-access': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-globals': ['error', {
        globals: [
          { name: 'require', message: 'Use static imports instead of the CommonJS loader.' },
          { name: 'module', message: 'Use static imports/exports instead of the CommonJS module object.' },
          { name: 'Function', message: 'Runtime code generation cannot establish workspace dependencies.' },
        ],
        checkGlobalObject: true,
        globalObjects: ['global'],
      }],
      'no-restricted-properties': ['error',
        ...processLoaders.map((property) => ({ object: 'process', property, message: 'Use static imports instead of runtime/native loaders.' })),
        ...['globalThis', 'global'].map((object) => ({ object, property: 'process', message: 'Use the canonical process binding, not a global-object alias.' })),
      ],
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'node:module', message: 'Use static imports, not runtime loaders.' },
          { name: 'module', message: 'Use static imports, not runtime loaders.' },
          { name: 'node:vm', message: 'Runtime code/module loading is outside the static-import policy.' },
          { name: 'vm', message: 'Runtime code/module loading is outside the static-import policy.' },
          ...['node:process', 'process'].map((name) => ({
            name, importNames: ['default', ...processLoaders],
            message: 'Use named non-loader process APIs or the canonical global process binding.',
          })),
        ],
        patterns: publicImportPatterns,
      }],
      'no-restricted-syntax': ['error',
        { selector: 'ImportExpression', message: 'Use static imports so architecture checks cannot be bypassed.' },
        { selector: 'TSImportEqualsDeclaration', message: 'Use static import or import type declarations.' },
        { selector: 'TSImportType', message: 'Use a static import type declaration.' },
      ],
    },
  },
];

const boundaryOptions = config.find((entry) => entry.rules?.['@nx/enforce-module-boundaries']).rules['@nx/enforce-module-boundaries'][1];

export default [
  ...config,
  {
    basePath: import.meta.dirname,
    files: testFiles,
    rules: {
      // Loader privileges only: dependency direction, public roots and relative
      // containment remain enabled for project test files.
      'qcrm/static-runtime-access': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': ['error', {
        selector: String.raw`ImportExpression[source.value=/^@quiron\u002f/]` + packageNames.map((name) => `:not([source.value="${name}"])`).join(''),
        message: 'Dynamic test imports must use declared workspace public roots, not subpaths.',
      }],
      'no-restricted-imports': ['error', { patterns: publicImportPatterns }],
      'no-restricted-modules': ['error', { patterns: ['@quiron/*', ...packageNames.map((name) => `!${name}`), '@quiron/*/*'] }],
    },
  },
  // Existing verification entrypoints only; never grant these paths to all tests.
  ...projectRoots.map((root) => ({
    basePath: import.meta.dirname,
    files: [`${root}/test/boundaries.test.mjs`],
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        ...boundaryOptions,
        allow: [path.relative(`${root}/test`, 'tools/check-module-boundaries.mjs')],
      }],
    },
  })),
  {
    basePath: import.meta.dirname,
    files: [fixtureConsumer],
    rules: { '@nx/enforce-module-boundaries': ['error', { ...boundaryOptions, allow: [fixtureImport] }] },
  },
];
