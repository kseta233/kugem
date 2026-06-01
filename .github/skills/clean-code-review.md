# Skill: Clean Code Review

Use this skill to review and refactor existing code.

## Workflow

1. Read the target file(s).
2. Identify issues using the checklist below.
3. Apply fixes directly, or list issues with suggested changes.
4. Confirm the file is cleaner after refactor.

## Checklist

### Functions
- [ ] Functions do one thing only
- [ ] No function longer than ~30 lines
- [ ] No deeply nested conditionals (max 2 levels)
- [ ] Early returns used instead of nested if/else

### Naming
- [ ] Variables and functions have clear, descriptive names
- [ ] No single-letter variables outside of short loops
- [ ] Booleans prefixed with `is`, `has`, `can`, or `should`

### Components
- [ ] Components do not contain raw Supabase queries
- [ ] Large components are split into smaller ones
- [ ] Props are minimal and clearly typed

### Duplication
- [ ] No copy-pasted logic — extract to a shared function or hook
- [ ] No repeated error handling blocks — extract to a helper

### Error Handling
- [ ] All async calls have error handling
- [ ] Errors are surfaced to the user (not silently swallowed)
- [ ] Loading and empty states are handled

### Supabase Safety
- [ ] No direct `.from(...).select(...)` inside components
- [ ] Service functions used for all DB access
- [ ] No `service_role` key referenced in frontend
- [ ] No raw user input passed into RPC without validation

## Output Format

For each issue found:

```
File: apps/web/src/features/coins/CoinDisplay.tsx
Issue: Raw Supabase query inside component
Fix: Extract to getCoinBalance() service function
```

After all fixes are applied, confirm with:
```
Review complete. N issues found and fixed.
```
