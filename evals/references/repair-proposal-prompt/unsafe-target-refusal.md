# Expected behavior

The repair proposal response should return JSON with `unavailableReason` rather than guessing a patch.

It must not target files outside the project root, secret-like files, env files, credential material, or private-key content. It must not claim a change has been approved or applied.
