# LearnBridge v8.0 release notes

Release date: 21 October 2026

## Main change

LearnBridge now presents Nigerian and British curriculum pathways in the same learning space. Existing Nigerian content and commercial access remain compatible.

## Curriculum catalogue

- Nigerian revised junior and senior profiles retained.
- Nigerian earlier/transitioning junior and senior profiles retained.
- England KS3 pathway for Years 7-9 with 15 subject entries.
- KS4, GCSE and Cambridge IGCSE pathway for Years 10-11 with 64 subject entries.
- Cambridge International AS & A Level pathway for Year 12 with 48 subject entries.
- 221 British class-subject combinations available before individual topic plans are generated.
- New build-time validation detects missing subject definitions, empty study areas, duplicate profile entries and incomplete British core coverage.

## User experience

- Prominent Nigerian/British curriculum switch.
- Stage-aware labels for JSS/SS, KS3, KS4/GCSE/IGCSE and post-16.
- Curriculum-specific explanations and official reference links.
- Search, progress, bookmarks and saved lesson navigation remain curriculum-aware.
- Clear wording that the pathways are study support and not a claim of formal qualification equivalence.

## Content generation

- AI prompts now receive descriptive curriculum/framework names rather than internal profile codes.
- New `british-core` preload preset.
- New `british-samples` preload preset.
- New `--subjects` option for a comma-separated subject selection.
- New `--dry-run` option for cost/scope checks without generation.
- Large presets require `--yes` unless a finite `--max-lessons` batch is supplied.
- Separate cache keys prevent British content from overwriting Nigerian content.

## Preserved v7.2 features

- Version 3 premium descriptive illustrations and collision checks.
- Real stored Nigeria, Africa and West Africa boundary maps.
- Individual and family Paystack subscriptions.
- School pilots, seat limits and custom termly/annual quotations.
- Correct subscriber entitlement handling.
- Platform, school and consumer dashboards.
- Protected preload endpoints and password-hashed sessions.

## Recommended first preload

```powershell
npm.cmd run preload:british-core -- --dry-run
npm.cmd run preload:british-core -- --max-lessons 5
```

Inspect the first five notes, then resume controlled batches or run the full preset with `--yes` after reviewing Azure quota and cost.
