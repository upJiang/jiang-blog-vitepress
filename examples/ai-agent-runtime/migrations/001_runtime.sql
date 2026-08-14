CREATE TABLE conversations (
  conversation_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE turns (
  turn_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id),
  owner_id UUID NOT NULL,
  idempotency_key TEXT,
  release_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'running', 'cancel_requested', 'completed', 'failed', 'cancelled', 'expired')
  ),
  owner_token UUID,
  deadline_at TIMESTAMPTZ NOT NULL,
  next_event_sequence BIGINT NOT NULL DEFAULT 1 CHECK (next_event_sequence > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, conversation_id, idempotency_key)
);

CREATE TABLE messages (
  message_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id),
  turn_id UUID NOT NULL REFERENCES turns(turn_id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX one_user_message_per_turn
  ON messages (turn_id) WHERE role = 'user';

CREATE UNIQUE INDEX one_assistant_message_per_turn
  ON messages (turn_id) WHERE role = 'assistant';

CREATE TABLE runtime_events (
  turn_id UUID NOT NULL REFERENCES turns(turn_id),
  sequence BIGINT NOT NULL CHECK (sequence > 0),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (turn_id, sequence)
);

CREATE UNIQUE INDEX one_terminal_event_per_turn
  ON runtime_events (turn_id)
  WHERE event_type IN ('turn.completed', 'turn.failed', 'turn.cancelled', 'turn.expired');

CREATE TABLE task_attempts (
  task_id UUID PRIMARY KEY,
  turn_id UUID NOT NULL REFERENCES turns(turn_id),
  attempt INTEGER NOT NULL CHECK (attempt > 0),
  owner_token UUID NOT NULL,
  lease_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (turn_id, attempt)
);
