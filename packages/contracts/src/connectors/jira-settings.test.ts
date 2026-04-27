import { describe, it, expect } from "vitest";
import { parseSync } from "../shared-schemas.js";
import {
  SJiraConnectorSettings,
  SJiraScopeMode,
  SJiraExtractionToggles,
  SJiraCredentialStoragePreference,
  type JiraConnectorSettings,
} from "./jira-settings.js";

describe("SJiraScopeMode", () => {
  it('parses "projects"', () => {
    expect(parseSync(SJiraScopeMode, "projects")).toBe("projects");
  });

  it('parses "jql"', () => {
    expect(parseSync(SJiraScopeMode, "jql")).toBe("jql");
  });

  it("rejects invalid scope mode", () => {
    expect(() => parseSync(SJiraScopeMode, "all")).toThrow();
    expect(() => parseSync(SJiraScopeMode, "")).toThrow();
  });
});

describe("SJiraExtractionToggles", () => {
  it("parses empty object", () => {
    const result = parseSync(SJiraExtractionToggles, {});
    expect(result).toEqual({});
  });

  it("parses partial overrides", () => {
    const result = parseSync(SJiraExtractionToggles, {
      includeComments: false,
      includeSubtasks: true,
    });
    expect(result).toEqual({
      includeComments: false,
      includeSubtasks: true,
    });
  });

  it("rejects non-boolean toggle values", () => {
    expect(() => parseSync(SJiraExtractionToggles, { includeComments: "yes" })).toThrow();
    expect(() => parseSync(SJiraExtractionToggles, { includeComments: 1 })).toThrow();
  });
});

describe("SJiraConnectorSettings", () => {
  const minimalValid: JiraConnectorSettings = {
    connectorId: "jira",
    siteUrl: "https://company.atlassian.net",
    accountEmail: "user@company.com",
  };

  it("parses minimal valid settings", () => {
    const result = parseSync(SJiraConnectorSettings, minimalValid);
    expect(result.connectorId).toBe("jira");
    expect(result.siteUrl).toBe("https://company.atlassian.net");
    expect(result.accountEmail).toBe("user@company.com");
    expect(result.scopeMode).toBe("projects"); // default
    expect(result.projectKeys).toEqual([]);
  });

  it("parses full valid settings with projects scope", () => {
    const full = {
      ...minimalValid,
      scopeMode: "projects" as const,
      projectKeys: ["PROJ", "ADMIN"],
      extractionToggles: {
        includeComments: false,
        includeSubtasks: true,
      },
    };
    const result = parseSync(SJiraConnectorSettings, full);
    expect(result.scopeMode).toBe("projects");
    expect(result.projectKeys).toEqual(["PROJ", "ADMIN"]);
    expect(result.extractionToggles?.includeComments).toBe(false);
    expect(result.extractionToggles?.includeSubtasks).toBe(true);
  });

  it("parses full valid settings with JQL scope", () => {
    const full = {
      ...minimalValid,
      scopeMode: "jql" as const,
      jql: "project = PROJ AND issuetype = Story ORDER BY updated DESC",
      extractionToggles: {
        includeComments: true,
        includeSprintData: true,
      },
    };
    const result = parseSync(SJiraConnectorSettings, full);
    expect(result.scopeMode).toBe("jql");
    expect(result.jql).toBe("project = PROJ AND issuetype = Story ORDER BY updated DESC");
    expect(result.extractionToggles?.includeSprintData).toBe(true);
  });

  it("rejects connectorId other than 'jira'", () => {
    expect(() =>
      parseSync(SJiraConnectorSettings, {
        ...minimalValid,
        connectorId: "outlook",
      }),
    ).toThrow();
    expect(() =>
      parseSync(SJiraConnectorSettings, {
        ...minimalValid,
        connectorId: "teams",
      }),
    ).toThrow();
  });

  it("rejects invalid siteUrl", () => {
    expect(() =>
      parseSync(SJiraConnectorSettings, {
        ...minimalValid,
        siteUrl: "not-a-url",
      }),
    ).toThrow();
    expect(() =>
      parseSync(SJiraConnectorSettings, {
        ...minimalValid,
        siteUrl: "ftp://internal.corp", // only http/https allowed
      }),
    ).toThrow();
    expect(() =>
      parseSync(SJiraConnectorSettings, {
        ...minimalValid,
        siteUrl: "",
      }),
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => parseSync(SJiraConnectorSettings, { connectorId: "jira" })).toThrow();
    expect(() =>
      parseSync(SJiraConnectorSettings, { connectorId: "jira", siteUrl: "https://example.atlassian.net" }),
    ).toThrow(); // missing accountEmail
    expect(() =>
      parseSync(SJiraConnectorSettings, { connectorId: "jira", accountEmail: "user@example.com" }),
    ).toThrow(); // missing siteUrl
  });

  it("rejects projectKeys with non-string entries", () => {
    expect(() =>
      parseSync(SJiraConnectorSettings, {
        ...minimalValid,
        projectKeys: ["PROJ", 123, "ADMIN"],
      }),
    ).toThrow();
  });

  it("normalizes: scopeMode projectKeys is optional with projectKeys defaulting to empty array", () => {
    const result = parseSync(SJiraConnectorSettings, minimalValid);
    expect(Array.isArray(result.projectKeys)).toBe(true);
    expect(result.projectKeys.length).toBe(0);
  });

  it("jql is optional when scopeMode is projects", () => {
    const result = parseSync(SJiraConnectorSettings, {
      ...minimalValid,
      scopeMode: "projects" as const,
      projectKeys: ["PROJ"],
    });
    expect(result.jql).toBeUndefined();
  });

  it("jql is optional even when scopeMode is jql (schema-level validation only — business rule enforced in step 03)", () => {
    // The schema allows missing jql; step 03 will enforce jql is required when scopeMode=jql
    const result = parseSync(SJiraConnectorSettings, {
      ...minimalValid,
      scopeMode: "jql" as const,
    });
    expect(result.jql).toBeUndefined();
  });
});

describe("SJiraCredentialStoragePreference", () => {
  it('parses "keychain"', () => {
    expect(parseSync(SJiraCredentialStoragePreference, 'keychain')).toBe('keychain');
  });

  it('parses "encrypted-local"', () => {
    expect(parseSync(SJiraCredentialStoragePreference, 'encrypted-local')).toBe('encrypted-local');
  });

  it('rejects invalid preference value', () => {
    expect(() => parseSync(SJiraCredentialStoragePreference, 'plaintext')).toThrow();
    expect(() => parseSync(SJiraCredentialStoragePreference, '')).toThrow();
    expect(() => parseSync(SJiraCredentialStoragePreference, 'keychain ')).toThrow();
  });
});

describe("SJiraConnectorSettings credentialStoragePreference", () => {
  const minimalValid: JiraConnectorSettings = {
    connectorId: "jira",
    siteUrl: "https://company.atlassian.net",
    accountEmail: "user@company.com",
  };

  it('defaults credentialStoragePreference to keychain', () => {
    const result = parseSync(SJiraConnectorSettings, minimalValid);
    expect(result.credentialStoragePreference).toBe('keychain');
  });

  it('parses explicit credentialStoragePreference: keychain', () => {
    const result = parseSync(SJiraConnectorSettings, {
      ...minimalValid,
      credentialStoragePreference: 'keychain',
    });
    expect(result.credentialStoragePreference).toBe('keychain');
  });

  it('parses explicit credentialStoragePreference: encrypted-local', () => {
    const result = parseSync(SJiraConnectorSettings, {
      ...minimalValid,
      credentialStoragePreference: 'encrypted-local',
    });
    expect(result.credentialStoragePreference).toBe('encrypted-local');
  });

  it('rejects invalid credentialStoragePreference value', () => {
    expect(() =>
      parseSync(SJiraConnectorSettings, {
        ...minimalValid,
        credentialStoragePreference: 'plaintext',
      }),
    ).toThrow();
  });
});
