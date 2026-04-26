import {
  intro,
  outro,
  multiselect,
  spinner,
  cancel,
  isCancel,
  note,
} from '@clack/prompts';
import pc from 'picocolors';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

// --- Configuration ---
const TASKS = [
  {
    value: 'nuke',
    label: '🪄  Hard Reset',
    hint: 'Wipe node_modules, dist, and all caches',
    order: 10,
    script: './scripts/obliviate.sh'
  },
  {
    value: 'install',
    label: '📦 Install Dependencies',
    hint: 'pnpm install + Prisma client generation',
    order: 20,
    script: './scripts/install.sh'
  },
  {
    value: 'docker_clean',
    label: '🐳 Docker Nuclear Reset',
    hint: 'Wipe volumes & restart all containers',
    order: 30,
    script: './scripts/docker-clean.sh'
  },
  {
    value: 'docker',
    label: '🏗️  Setup Docker Infrastructure',
    hint: 'Launch Postgres, Kafka, and Redis',
    order: 35,
    script: './scripts/docker-setup.sh'
  },
  {
    value: 'db_studio',
    label: '💎 Database Studio',
    hint: 'Open Prisma Studio UI',
    order: 40,
    script: 'pnpm db:studio'
  },
  {
    value: 'kafka_ui',
    label: '🛰️  Start Kafka UI',
    hint: 'Launch the optional debug dashboard',
    order: 45,
    script: 'pnpm docker:ui'
  },
  {
    value: 'lint',
    label: '🧹 Hygiene Check',
    hint: 'Run all linters (TS, MD, Actions)',
    order: 50,
    script: 'pnpm lint'
  },
  {
    value: 'knip',
    label: '🕵️‍♂️ Dead Code Analysis',
    hint: 'Find unused files, deps, and exports',
    order: 55,
    script: 'pnpm lint:knip'
  },
  {
    value: 'test',
    label: '🧪 Quality Gate',
    hint: 'Run full Vitest suite',
    order: 60,
    script: 'pnpm test'
  }
];

/**
 * @param {{ label: string, script: string, value: string }} task
 */
async function runTask(task) {
  const s = spinner();
  s.start(`Executing: ${task.label}`);

  return new Promise((resolve, reject) => {
    // We use spawn with inherit for scripts to keep the colored output
    // but we pipe for standard commands
    const isLocalScript = task.script.startsWith('./');

    const child = spawn(isLocalScript ? task.script : 'pnpm',
      isLocalScript ? [] : ['run', task.script.split(':')[1]],
      { stdio: 'inherit', shell: true, cwd: ROOT });

    child.on('exit', (code) => {
      if (code === 0) {
        s.stop(`${task.label} ${pc.green('completed')}`);
        resolve();
      } else {
        s.stop(`${task.label} ${pc.red('failed')}`);
        reject(new Error(`Task ${task.value} failed with code ${code}`));
      }
    });
  });
}

// --- Wizard ---
async function startWizard() {
  console.clear();

  intro(`${pc.magenta(pc.bold('🏗️  METERPLEX SETUP WIZARD'))}`);

  const selectedValues = await multiselect({
    message: 'What would you like to do? ' + pc.dim('(Space to select, Enter to confirm)'),
    options: TASKS.map(t => ({ value: t.value, label: t.label, hint: t.hint })),
    required: true,
  });

  if (isCancel(selectedValues)) {
    cancel('Setup aborted.');
    process.exit(0);
  }

  // Sort selected tasks by predefined order
  let selectedTasks = TASKS
    .filter(t => selectedValues.includes(t.value))
    .sort((a, b) => a.order - b.order);

  // Deduplicate redundant knip tasks (Lint already runs knip)
  if (selectedValues.includes('lint') && selectedValues.includes('knip')) {
    selectedTasks = selectedTasks.filter(t => t.value !== 'knip');
  }

  note(
    selectedTasks.map((t, i) => `${i + 1}. ${t.label}`).join('\n'),
    'Execution Plan'
  );

  try {
    for (const task of selectedTasks) {
      await runTask(task);
    }

    outro(`${pc.green(pc.bold('✅ ALL TASKS COMPLETED SUCCESSFULLY!'))}`);

    console.log(pc.dim('\nNext steps:'));
    console.log(pc.cyan('  pnpm start:dev    ') + pc.dim('Start the application'));
    console.log(pc.cyan('  pnpm test         ') + pc.dim('Run the test suite\n'));

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    cancel(`Setup failed: ${errorMessage}`);
    process.exit(1);
  }
}

await startWizard();
