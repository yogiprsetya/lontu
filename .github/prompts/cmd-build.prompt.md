---
name: cmd-build
description: Implement tasks incrementally — build, test, verify, write commit message.
---

Invoke the incremental-implementation skill alongside test-driven-development.

Pick the next pending task from the plan. Then:

1. Read the task's acceptance criteria
2. Load relevant context (existing code, patterns, types)
3. Write a failing test for the expected behavior (RED)
4. Implement the minimum code to pass the test (GREEN)
5. Run the full test suite to check for regressions
6. Run the build to verify compilation
7. Write a descriptive commit message
8. Mark the task complete and stop

Additional skill (pick with related task only):

- frontend related task -> gpt-taste design-taste-frontend
- backend related task -> api-and-interface-design
- responsive web related task -> imagegen-frontend-mobile

If any step fails, follow the debugging-and-error-recovery skill.

Task file `docs/todo.md` and `docs/plan.md`.
