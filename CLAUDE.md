@AGENTS.md

## Context Management

When context usage approaches **85%**, proactively invoke `/compact` before continuing work.
Do not wait for the user to ask. Check context level after every major implementation block.
After compacting, save a memory checkpoint with current project state if significant changes were made.
