# Backend full-stack pilot

The first published backend batch contains a real vertical slice:

- `react/`: React, Vite, React Router, TanStack Query, React Hook Form, Zod, and Ant Design.
- `node/`: NestJS, Prisma, MySQL, Argon2id, short-lived JWT access tokens, rotating refresh sessions, tenant-scoped project CRUD, and optimistic versions.
- `compose.yaml`: MySQL 8.4 plus the Node API.

Python, Go, Redis, brokers, object storage, CI, and Kubernetes will be added with their corresponding deep articles. The previous placeholder services were removed so unfinished examples are not presented as verified implementations.

```bash
# Start the isolated MySQL instance.
docker compose -f examples/backend/compose.yaml up -d mysql

# Generate and migrate the Prisma schema, then seed the local account.
DATABASE_URL='mysql://backend:backend-local-only@127.0.0.1:3307/backend_learning' \
  yarn --cwd examples/backend/node prisma:generate
DATABASE_URL='mysql://backend:backend-local-only@127.0.0.1:3307/backend_learning' \
  yarn --cwd examples/backend/node prisma:migrate
DATABASE_URL='mysql://backend:backend-local-only@127.0.0.1:3307/backend_learning' \
  yarn --cwd examples/backend/node prisma:seed

yarn --cwd examples/backend/node dev
yarn --cwd examples/backend/react dev
```

```bash
yarn --cwd examples/backend/node lint
yarn --cwd examples/backend/node test
yarn --cwd examples/backend/node build
yarn --cwd examples/backend/react typecheck
yarn --cwd examples/backend/react build
```

The seed account is `demo@example.test` / `local-password`. These values and the local JWT secret are for the isolated teaching environment only.
