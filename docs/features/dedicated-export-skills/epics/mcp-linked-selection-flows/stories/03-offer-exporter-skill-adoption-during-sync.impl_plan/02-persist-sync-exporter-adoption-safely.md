# Step 2: Persist sync exporter adoption safely

## Objective
Applying exporter adoption during sync should record selected workflow skills only when the corresponding managed file adoption/review action succeeds.

## Tasks
- Carry implied workflow skill metadata on relevant sync previews.
- Update state selection when users create or start managing the implied exporter skill file.
- Keep skip and side-template actions from claiming the exporter skill is selected.

## Verification
- Sync action/state tests cover applied adoption and skipped adoption behavior.

## Review Status
Approved on 2026-05-19T14:08:00-06:00.
