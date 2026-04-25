/**
 * Jira Settings Store
 *
 * Persists Jira non-secret settings to a dedicated JSON file (not desktop-settings.json).
 * Secrets go through the credential adapter (safeStorage), never here.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseSync } from "@srgnt/contracts";
import type { JiraConnectorSettings } from "@srgnt/contracts";

export function getJiraSettingsPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".command-center", "config", "jira-settings.json");
}

export async function readJiraSettings(workspaceRoot: string): Promise<JiraConnectorSettings | null> {
  if (!workspaceRoot) return null;
  const filePath = getJiraSettingsPath(workspaceRoot);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    // Validate against schema to protect against tampered/stale files
    return parseSync(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("@srgnt/contracts")).SJiraConnectorSettings as any,
      parsed,
    );
  } catch {
    return null;
  }
}

export async function writeJiraSettings(
  workspaceRoot: string,
  settings: JiraConnectorSettings,
): Promise<void> {
  const filePath = getJiraSettingsPath(workspaceRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf8");
}
