#!/usr/bin/env node
// A fake CLI that ignores `--version` and hangs forever, used to exercise the
// version-probe timeout + kill path (no orphan left behind). Records its own
// pid so the test can assert the process was actually reaped.
import { writeFileSync } from 'node:fs';

const pidFile = process.env.HANG_PID_FILE;
if (pidFile) writeFileSync(pidFile, String(process.pid));
setInterval(() => {}, 1000);
