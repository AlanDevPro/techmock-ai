// 📁 lib/techIcons.ts
// Mapea el nombre de tecnología (como viene de la tabla `tecnologias`)
// a un slug de Devicon. Devicon cubre la gran mayoría de stacks web.
// CDN: https://cdn.jsdelivr.net/gh/devicons/devicon/icons/{slug}/{slug}-original.svg

const DEVICON_MAP: Record<string, string> = {
  // Lenguajes
  javascript: "javascript/javascript-original",
  typescript: "typescript/typescript-original",
  python: "python/python-original",
  java: "java/java-original",
  "c#": "csharp/csharp-original",
  csharp: "csharp/csharp-original",
  php: "php/php-original",
  go: "go/go-original",
  golang: "go/go-original",
  rust: "rust/rust-original",
  ruby: "ruby/ruby-original",
  kotlin: "kotlin/kotlin-original",
  swift: "swift/swift-original",
  c: "c/c-original",
  "c++": "cplusplus/cplusplus-original",
  cpp: "cplusplus/cplusplus-original",

  // Frontend
  react: "react/react-original",
  "react.js": "react/react-original",
  vue: "vuejs/vuejs-original",
  "vue.js": "vuejs/vuejs-original",
  angular: "angularjs/angularjs-original",
  svelte: "svelte/svelte-original",
  next: "nextjs/nextjs-original",
  "next.js": "nextjs/nextjs-original",
  nuxt: "nuxtjs/nuxtjs-original",
  html: "html5/html5-original",
  html5: "html5/html5-original",
  css: "css3/css3-original",
  css3: "css3/css3-original",
  sass: "sass/sass-original",
  tailwind: "tailwindcss/tailwindcss-original",
  tailwindcss: "tailwindcss/tailwindcss-original",
  redux: "redux/redux-original",

  // Backend / runtime
  node: "nodejs/nodejs-original",
  "node.js": "nodejs/nodejs-original",
  nodejs: "nodejs/nodejs-original",
  express: "express/express-original",
  django: "django/django-plain",
  flask: "flask/flask-original",
  spring: "spring/spring-original",
  "spring boot": "spring/spring-original",
  laravel: "laravel/laravel-plain",
  nestjs: "nestjs/nestjs-plain",
  "nest.js": "nestjs/nestjs-plain",

  // Bases de datos / infra
  postgresql: "postgresql/postgresql-original",
  postgres: "postgresql/postgresql-original",
  mysql: "mysql/mysql-original",
  mongodb: "mongodb/mongodb-original",
  redis: "redis/redis-original",
  docker: "docker/docker-original",
  kubernetes: "kubernetes/kubernetes-plain",
  graphql: "graphql/graphql-plain",

  // Otros
  git: "git/git-original",
  linux: "linux/linux-original",
  flutter: "flutter/flutter-original",
  dart: "dart/dart-original",
  r: "r/r-original",
};

function normalize(name: string) {
  return name.trim().toLowerCase();
}

export function getTechIconUrl(tecnologiaNombre: string | null | undefined): string | null {
  if (!tecnologiaNombre) return null;
  const key = normalize(tecnologiaNombre);
  const slug = DEVICON_MAP[key];
  if (!slug) return null;
  return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}.svg`;
}

export function hasTechIcon(tecnologiaNombre: string | null | undefined): boolean {
  if (!tecnologiaNombre) return false;
  return normalize(tecnologiaNombre) in DEVICON_MAP;
}