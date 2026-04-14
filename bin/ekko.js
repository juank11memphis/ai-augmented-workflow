#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:readline/promises"));
const node_process_1 = require("node:process");
const command = process.argv[2];
async function main() {
    if (!command || command === '--help' || command === '-h') {
        printHelp();
        return;
    }
    if (command !== 'init') {
        console.error(`Unknown command: ${command}`);
        console.error('');
        printHelp();
        process.exitCode = 1;
        return;
    }
    await initProject();
}
async function initProject() {
    const targetPath = node_path_1.default.join(process.cwd(), 'AGENTS.md');
    if (node_fs_1.default.existsSync(targetPath)) {
        console.error('AGENTS.md already exists in this directory.');
        console.error('This first iteration only initializes brand-new projects and will not overwrite existing files.');
        process.exitCode = 1;
        return;
    }
    console.log('Ekko will create an AGENTS.md file for this project.');
    console.log('This file tells AI coding agents what the project is about and how they should work here.');
    console.log('');
    const rl = promises_1.default.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
    let overview;
    try {
        overview = await askRequired(rl, [
            'Tell Ekko what this project is about.',
            'A short sentence or paragraph is enough.',
            'Example: "A local-first notes app for software teams."',
            '',
            'Project overview: ',
        ].join('\n'), 'Please enter a short project overview so Ekko can initialize AGENTS.md.');
    }
    finally {
        rl.close();
    }
    const templatePath = node_path_1.default.join(__dirname, '..', 'templates', 'AGENTS.md');
    const template = node_fs_1.default.readFileSync(templatePath, 'utf8');
    const rendered = template.replace('{{PROJECT_OVERVIEW}}', overview.trim());
    node_fs_1.default.writeFileSync(targetPath, rendered, { encoding: 'utf8', flag: 'wx' });
    console.log('Created AGENTS.md');
}
async function askRequired(rl, question, emptyMessage) {
    while (true) {
        const answer = await rl.question(question);
        if (answer.trim()) {
            return answer;
        }
        console.log(emptyMessage);
    }
}
function printHelp() {
    console.log(`ekko

Usage:
  ekko init

Commands:
  init    Initialize a brand-new project with an AGENTS.md file
`);
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
