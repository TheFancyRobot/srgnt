/**
 * Jira Connector Settings Schema
 *
 * Non-secret Jira configuration stored in a dedicated jira-settings.json file
 * (via jira-settings-store.ts), separate from desktop-settings.json.
 * Secrets (API tokens) go through the OS-keychain/safeStorage credential adapter only.
 */
import { Schema } from "@effect/schema";
import { UrlString } from "../shared-schemas.js";

export const SJiraScopeMode = Schema.Literal("projects", "jql");
export type JiraScopeMode = Schema.Schema.Type<typeof SJiraScopeMode>;

// All fields optional — defaults are applied at the application layer, not schema layer
export const SJiraExtractionToggles = Schema.Struct({
  includeComments: Schema.optional(Schema.Boolean),
  includeIssueLinks: Schema.optional(Schema.Boolean),
  includeSubtasks: Schema.optional(Schema.Boolean),
  includeSprintData: Schema.optional(Schema.Boolean),
  includeWorklogSummary: Schema.optional(Schema.Boolean),
  includeAttachmentMetadata: Schema.optional(Schema.Boolean),
  includeChangelogSummary: Schema.optional(Schema.Boolean),
});
export type JiraExtractionToggles = Schema.Schema.Type<typeof SJiraExtractionToggles>;

export const SJiraConnectorSettings = Schema.Struct({
  connectorId: Schema.Literal("jira"), // fixed per phase contract
  siteUrl: UrlString, // e.g. https://company.atlassian.net
  accountEmail: Schema.String, // e.g. user@company.com
  scopeMode: Schema.optionalWith(SJiraScopeMode, { default: () => "projects" as const }),
  projectKeys: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] as readonly string[] }),
  jql: Schema.optional(Schema.String),
  extractionToggles: Schema.optional(SJiraExtractionToggles),
});
export type JiraConnectorSettings = Schema.Schema.Type<typeof SJiraConnectorSettings>;
