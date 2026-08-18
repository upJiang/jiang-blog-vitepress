---
name: source-grounded-review
description: Review technical claims against supplied source files and test output. Use when a draft makes version, API, behavior, or verification claims that need evidence.
license: MIT
compatibility: Requires file-reading access. Test execution depends on the reviewed project.
metadata:
  version: "1.0.0"
---

# Source-grounded technical review

## Inputs

Collect the draft, the source files that are allowed to support it, and any test output supplied for this review. Do not infer private source locations or run unrelated projects.

## Review flow

1. Extract claims about versions, APIs, behavior, limits, test results, and production outcomes.
2. Match each claim to a source location or an observed test result.
3. Classify unsupported claims as needs-source, explanation-only, or remove.
4. Preserve code and links while rewriting only the unsupported or ambiguous prose.
5. Return findings with the claim, evidence, and smallest correction.

Read [the evidence rules](references/evidence-rules.md) when a claim depends on test output, production behavior, or a version-sensitive API.

## Stop conditions

Stop and report the gap when the allowed sources cannot prove a material claim. Do not invent a benchmark, incident, user story, or successful command output.

