#!/usr/bin/env node
// Scriptable fake agent for supervisor tests. Pure Node, no ACP — it only needs
// to model the *process* behaviors the supervisor must survive. Mode is argv[2].
//
//   spawn-grandchild : fork a long-lived grandchild, print {"pid","grandchild"},
//                      then idle. Used to prove kill-tree leaves no orphans.
//   sleep            : idle forever (well-behaved child).
//   echo             : echo each stdin line back to stdout (transport smoke test).
//   crash            : write to stderr, then exit(1) after a short delay.
//   ignore-sigterm   : trap and ignore SIGTERM, idle forever (SIGKILL escalation).
import { spawn } from 'node:child_process';

const mode = process.argv[2] ?? 'sleep';
const idle = () => setInterval(() => {}, 1 << 30);

switch (mode) {
  case 'spawn-grandchild': {
    // Detached so it is NOT in this process's job on Windows; on POSIX it stays
    // in our process group (we are the group leader) — which is exactly what
    // kill-tree must sweep up.
    const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1 << 30)'], {
      stdio: 'ignore',
    });
    process.stdout.write(`${JSON.stringify({ pid: process.pid, grandchild: grandchild.pid })}\n`);
    idle();
    break;
  }
  case 'echo': {
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index = buffer.indexOf('\n');
      while (index !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        process.stdout.write(`${line}\n`);
        index = buffer.indexOf('\n');
      }
    });
    idle();
    break;
  }
  case 'crash': {
    process.stderr.write('fake-agent: fatal boom on line 1\n');
    process.stderr.write('fake-agent: stack frame 2\n');
    setTimeout(() => process.exit(1), 30);
    break;
  }
  case 'ignore-sigterm': {
    process.on('SIGTERM', () => {
      /* deliberately ignore — force the supervisor to escalate to SIGKILL */
    });
    process.stdout.write(`${JSON.stringify({ pid: process.pid })}\n`);
    idle();
    break;
  }
  case 'sleep':
  default: {
    process.stdout.write(`${JSON.stringify({ pid: process.pid })}\n`);
    idle();
    break;
  }
}
