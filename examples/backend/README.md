# Backend full-stack reference

This directory keeps one HTTP contract and one MySQL schema behind three API implementations:

- `react/`: React, Vite, React Router, TanStack Query, React Hook Form, Zod, and Ant Design.
- `node/`: NestJS, Prisma, MySQL, Argon2id, short-lived JWT access tokens, rotating refresh sessions, tenant-scoped project CRUD, and optimistic versions.
- `python/`: FastAPI, SQLAlchemy 2, async MySQL and pytest.
- `go/`: Gin, GORM, MySQL and standard Go tests.
- `common/`: the OpenAPI 3.1 contract, canonical MySQL schema and deterministic seed.
- `compose.yaml`: MySQL 8.4, Redis, RabbitMQ, MinIO and opt-in API services.

`common/schema.sql` is the canonical schema. Prisma, SQLAlchemy and GORM map to that schema; they do not each invent a different set of tables. The checked-in Prisma migration mirrors the same SQL for teams that standardize on Prisma Migrate, but do not run both migration paths against one database.

```bash
# Start infrastructure and apply the shared schema once.
docker compose -f examples/backend/compose.yaml up -d mysql redis rabbitmq minio minio-init object-gateway migrate

# Generate the Prisma client. Compose has already applied and seeded the canonical schema.
DATABASE_URL='mysql://backend:backend-local-only@127.0.0.1:3307/backend_learning' \
  yarn --cwd examples/backend/node prisma:generate

yarn --cwd examples/backend/node dev
yarn --cwd examples/backend/react dev
```

To start all three APIs through Compose, use the `apis` profile. Each process exposes the same routes on a different host port; set `VITE_API_ORIGIN` to one of them before starting React.

```bash
docker compose -f examples/backend/compose.yaml --profile apis up -d
VITE_API_ORIGIN=http://localhost:3002 yarn --cwd examples/backend/react dev
```

Run the same contract smoke against each implementation after starting the `apis` profile. It creates isolated demo orders and tasks, so use only the teaching database.

```bash
API_ORIGIN=http://localhost:3001 node examples/backend/common/contract-smoke.mjs
API_ORIGIN=http://localhost:3002 node examples/backend/common/contract-smoke.mjs
API_ORIGIN=http://localhost:3003 node examples/backend/common/contract-smoke.mjs
```

```bash
yarn --cwd examples/backend/node lint
yarn --cwd examples/backend/node test
yarn --cwd examples/backend/node build
yarn --cwd examples/backend/react typecheck
yarn --cwd examples/backend/react build
```

The seed account is `demo@example.test` / `local-password`. These values and the local JWT secret are for the isolated teaching environment only.
