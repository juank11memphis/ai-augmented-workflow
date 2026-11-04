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




    it('resolves all four role keys, saves only an explicit selection, and reuses exact state', () => {
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
            assert.equal(state.modelRoutes.length, 4);
            assert.equal(resolveProjectModelRoute({ type: 'models:resolve', agentEnvironment: 'codex', role: 'user-created-agent', workloadClass: 'bounded' }, root).status, 'unsupported');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });


});
