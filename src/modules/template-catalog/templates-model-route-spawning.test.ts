import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { resolveProjectModelRoute, setProjectModelRoute } from '../workflow-configuration-manager/model-route-adapters.js';
import { readTemplate } from './index.js';

const guidance = readTemplate('AGENTS.md');
const roles = [
    ['skills/ai-implementation-planner/SKILL.md', 'implementation-planner', 'sibu-implementation-planner'],
    ['skills/ai-implementation-plan-executor/SKILL.md', 'implementation-executor', 'sibu-implementation-executor'],
    ['skills/ai-implementation-plan-executor/SKILL.md', 'architecture-reviewer', 'sibu-architecture-reviewer'],
    ['skills/export-to-github/SKILL.md', 'github-exporter', 'github-exporter'],
    ['skills/export-to-notion/SKILL.md', 'notion-exporter', 'notion-exporter'],
 ] as const;
const effortRule = /(?:explicit[^\n]*model[^\n]*reasoning effort|`model`[^\n]*`reasoning_effort`[^\n]*explicit|explicit[^\n]*`model`[^\n]*`reasoning_effort`)/i;
const inheritanceRule = /(?:never|do not|no)[^\n]*parent inheritance|(?:never|do not)[^\n]*inherit[^\n]*parent/i;
const fallbackRule = /(?:never|do not|no)[^\n]*silent fallback/i;

function assertRouteContract(source: string, roleSource: string, role: string, agent: string): void {
    assert.match(source, new RegExp(`\\b${agent}\\b`));
    assert.match(source, new RegExp(`--role ${role}\\b`));
    assert.match(source, /classify[^\n]*before[^\n]*resolv/i);
    assert.match(source, /sibu models resolve --agent <environment> --role <role> --workload <class> --json/);
    assert.match(source, /sibu models set --agent <environment> --role <role> --workload <class>/);
    assert.match(source, /--catalog-version <version> --state-basis <token> --json/);
    assert.match(roleSource, effortRule);
    assert.match(roleSource, inheritanceRule);
    assert.match(roleSource, fallbackRule);
}

describe('Sibu-provided sub-agent model routing', () => {
    it('routes every supported role through one provider-neutral protocol', () => {
        for (const [path, role, agent] of roles) {
            const roleSource = readTemplate(path);
            assertRouteContract(`${guidance}\n${roleSource}`, roleSource, role, agent);
        }
        assert.match(guidance, /bounded[^\n]*clear[^\n]*narrow/i);
        assert.match(guidance, /demanding[^\n]*ambiguous[^\n]*multi-step/i);
        assert.match(guidance, /high-risk[^\n]*security[^\n]*privacy[^\n]*destructive/i);
        assert.match(guidance, /material[^\n]*uncertain[^\n]*higher-risk/i);
        assert.match(guidance, /user-created agents[^\n]*not routed/i);
    });

    it('fails omission mutations for any role, effort, and fallback rule', () => {
        for (const [path, role, agent] of roles) {
            const roleSource = readTemplate(path);
            const withoutRole = roleSource.replace(`--role ${role}`, '--role omitted');
            assert.throws(() => assertRouteContract(`${guidance}\n${withoutRole}`, withoutRole, role, agent));
            for (const rule of [effortRule, inheritanceRule, fallbackRule]) {
                const omitted = roleSource.replace(new RegExp(rule.source, 'gi'), 'omitted routing rule');
                assert.throws(() => assertRouteContract(`${guidance}\n${omitted}`, omitted, role, agent), `${role} must fail without ${rule}`);
            }
        }
    });

    it('preserves the binding conversation and state transitions', () => {
        const sequence = [
            'Workload:', 'Recommended', 'Best expected fit', 'Recommendation, not a guarantee',
            'Use recommended', 'Choose another', 'Cancel',
        ];
        let last = -1;
        for (const phrase of sequence) {
            const position = guidance.indexOf(phrase, last + 1);
            assert.ok(position > last, `${phrase} must follow the prior first-use content`);
            last = position;
        }
        for (const phrase of [
            'Using the saved repo route', 'User selected', 'Not recommended',
            'Recommended replacement', 'Use and save replacement', 'Retry',
            'Use once without saving', 'No shared setting was changed',
        ]) assert.ok(guidance.includes(phrase), `${phrase} must be visible`);
        assert.match(guidance, /Cancel[^\n]*no (?:write|save)[^\n]*no spawn/i);
        assert.match(guidance, /Use once[^\n]*no (?:write|save)[^\n]*one spawn/i);
        assert.match(guidance, /explicit choice[^\n]*before[^\n]*sibu models set/i);
        assert.match(guidance, /host reject[^\n]*preserve[^\n]*saved route/i);
        assert.match(guidance, /workflow-unavailable[^\n]*unsupported[^\n]*no spawn/i);
        assert.match(guidance, /conflict[^\n]*re-resolve[^\n]*re-review/i);
        assert.match(guidance, /any route other than the current recommendation `User selected`/i);
        assert.match(guidance, /catalog-listed alternative/i);
        assert.match(guidance, /Label a chosen route `User selected` in the confirmation whenever it differs from the current recommendation/i);
        assert.match(guidance, /Never present that known-rejected model\/effort pair as its own replacement/i);
        assert.match(guidance, /If no distinct viable replacement is known[^\n]*`Choose another` or `Cancel`/i);
    });

    it('retains foreground implementation and background exporter authority', () => {
        const executor = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
        assert.match(executor, /All implementation execution stays in the foreground/);
        assert.match(executor, /Resolve the architecture reviewer's model route before launching the read-only reviewer/);
        assert.match(executor, /Do not run an executor while the reviewer is active/);
        assert.match(executor, /Keep Story integration and continuation with the main agent/);
        for (const path of ['skills/export-to-github/SKILL.md', 'skills/export-to-notion/SKILL.md']) {
            const source = readTemplate(path);
            assert.match(source, /Start the `(?:github|notion)-exporter` sub-agent in the background/);
            assert.match(source, /Ask one explicit opt-in question before/);
            assert.match(source, /no-local-write rule/);
        }
    });

    it('keeps main-agent profiles advisory and outside route state', () => {
        assert.match(guidance, /GPT-6 Sol\/medium[^\n]*normal or demanding/i);
        assert.match(guidance, /GPT-6 Luna\/low[^\n]*clearly narrow/i);
        assert.match(guidance, /GPT-6 Astra\/high[^\n]*high-risk/i);
        assert.match(guidance, /main-agent[^\n]*not persisted[^\n]*not enforced/i);
    });

    it('resolves all five role keys, saves only an explicit selection, and reuses exact state', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-spawn-routes-'));
        const statePath = path.join(root, '.sibu', 'state.json');
        fs.mkdirSync(path.dirname(statePath));
        fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: ['codex'], managedFiles: {} }));
        try {
            for (const [, role] of roles) {
                const key = { type: 'models:resolve' as const, agentEnvironment: 'codex', role, workloadClass: 'bounded' };
                const missing = resolveProjectModelRoute(key, root);
                assert.equal(missing.status, 'missing', role);
                if (missing.status !== 'missing') throw new Error(`Expected missing route for ${role}`);
                const beforeChoice = fs.readFileSync(statePath, 'utf8');
                assert.equal(resolveProjectModelRoute(key, root).status, 'missing');
                assert.equal(fs.readFileSync(statePath, 'utf8'), beforeChoice, 'resolve and cancellation are read-only');
                const saved = setProjectModelRoute({ ...key, type: 'models:set', model: missing.catalog.recommendation.model,
                    reasoningEffort: missing.catalog.recommendation.reasoningEffort,
                    catalogVersion: missing.catalog.catalogVersion, stateBasis: missing.stateBasis }, root);
                assert.equal(saved.status, 'saved', role);
                if (saved.status !== 'saved') throw new Error(`Expected saved route for ${role}`);
                const configured = resolveProjectModelRoute(key, root);
                assert.equal(configured.status, 'configured', role);
                if (configured.status !== 'configured') throw new Error(`Expected configured route for ${role}`);
                assert.equal(configured.route.model, saved.route.model);
                assert.equal(configured.route.reasoningEffort, saved.route.reasoningEffort);
                assert.equal(resolveProjectModelRoute({ ...key, workloadClass: 'high-risk' }, root).status, 'missing');
            }
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            assert.equal(state.modelRoutes.length, 5);
            assert.equal(resolveProjectModelRoute({ type: 'models:resolve', agentEnvironment: 'codex', role: 'user-created-agent', workloadClass: 'bounded' }, root).status, 'unsupported');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('labels catalog-listed alternatives as user selected and preserves them after host rejection', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-route-rejection-'));
        const statePath = path.join(root, '.sibu', 'state.json');
        fs.mkdirSync(path.dirname(statePath));
        fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: ['codex'], managedFiles: {} }));
        const key = { agentEnvironment: 'codex', role: 'implementation-executor', workloadClass: 'bounded' } as const;
        try {
            const missing = resolveProjectModelRoute({ type: 'models:resolve', ...key }, root);
            assert.equal(missing.status, 'missing');
            if (missing.status !== 'missing') return;
            const saved = setProjectModelRoute({ type: 'models:set', ...key, model: 'gpt-6-sol', reasoningEffort: 'medium',
                catalogVersion: missing.catalog.catalogVersion, stateBasis: missing.stateBasis }, root);
            assert.equal(saved.status, 'saved');
            if (saved.status !== 'saved') return;
            assert.equal(saved.route.origin, 'user-selected');
            const beforeRejection = fs.readFileSync(statePath, 'utf8');
            const configured = resolveProjectModelRoute({ type: 'models:resolve', ...key }, root);
            assert.equal(configured.status, 'configured');
            if (configured.status !== 'configured') return;
            assert.equal(configured.origin, 'user-selected');
            assert.equal(configured.route.model, 'gpt-6-sol');
            // Host rejection is external: without an explicit replacement choice, do not call set again.
            assert.equal(fs.readFileSync(statePath, 'utf8'), beforeRejection);
            assert.match(guidance, /preserve the saved route and pause/i);
            assert.match(guidance, /known-rejected model\/effort pair/i);
        } finally { fs.rmSync(root, { recursive: true, force: true }); }
    });

    it('does not persist failed, one-time, cancelled, or conflicted choices; retry needs fresh review', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-route-recovery-'));
        const statePath = path.join(root, '.sibu', 'state.json');
        fs.mkdirSync(path.dirname(statePath));
        fs.writeFileSync(statePath, JSON.stringify({ sibuVersion: '1', templateVersion: '1', generatedAt: 'old', updatedAt: 'old', selectedAgents: ['codex'], managedFiles: {} }));
        const key = { agentEnvironment: 'codex', role: 'implementation-planner', workloadClass: 'demanding' } as const;
        try {
            const missing = resolveProjectModelRoute({ type: 'models:resolve', ...key }, root);
            assert.equal(missing.status, 'missing');
            if (missing.status !== 'missing') return;
            const choice = { type: 'models:set' as const, ...key, model: missing.catalog.recommendation.model,
                reasoningEffort: missing.catalog.recommendation.reasoningEffort,
                catalogVersion: missing.catalog.catalogVersion, stateBasis: missing.stateBasis };
            const beforeChoice = fs.readFileSync(statePath, 'utf8');
            fs.writeFileSync(`${statePath}.lock`, 'occupied');
            assert.equal(setProjectModelRoute(choice, root).status, 'failed');
            assert.equal(fs.readFileSync(statePath, 'utf8'), beforeChoice);
            // Use once and Cancel remain conversation/host decisions, not persistence calls.
            assert.equal(resolveProjectModelRoute({ type: 'models:resolve', ...key }, root).status, 'missing');
            assert.equal(fs.readFileSync(statePath, 'utf8'), beforeChoice);
            fs.unlinkSync(`${statePath}.lock`);
            assert.equal(setProjectModelRoute({ ...choice, catalogVersion: 'stale' }, root).status, 'conflict');
            assert.equal(fs.readFileSync(statePath, 'utf8'), beforeChoice);
            const reviewedAgain = resolveProjectModelRoute({ type: 'models:resolve', ...key }, root);
            assert.equal(reviewedAgain.status, 'missing');
            if (reviewedAgain.status !== 'missing') return;
            const retry = setProjectModelRoute({ ...choice, catalogVersion: reviewedAgain.catalog.catalogVersion,
                stateBasis: reviewedAgain.stateBasis }, root);
            assert.equal(retry.status, 'saved');
            assert.match(guidance, /Use once[^\n]*no write and one spawn/i);
            assert.match(guidance, /Cancel[^\n]*no write and no spawn/i);
        } finally { fs.rmSync(root, { recursive: true, force: true }); }
    });
});
