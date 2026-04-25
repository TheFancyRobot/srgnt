export interface JiraAuthor {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
}

export interface JiraComment {
  id: string;
  author: JiraAuthor;
  body: string;
  created: string;
  updated: string;
}

export interface JiraIssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
}

export interface JiraIssueLink {
  id: string;
  type: JiraIssueLinkType;
  outwardIssue?: { id: string; key: string; fields: { summary: string; status: { name: string } } };
  inwardIssue?: { id: string; key: string; fields: { summary: string; status: { name: string } } };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate: string;
  endDate: string;
  completeDate?: string;
}

export interface JiraWorklog {
  id: string;
  author: JiraAuthor;
  created: string;
  updated: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  created: string;
  author: JiraAuthor;
  content: string;
}

export interface JiraChangelogItem {
  field: string;
  fromString: string | null;
  toString: string | null;
}

export interface JiraChangelog {
  id: string;
  created: string;
  items: JiraChangelogItem[];
}

export interface JiraIssueFields {
  summary: string;
  description: string | null;
  status: { name: string; id: string };
  priority: { name: string; id: string };
  assignee: JiraAuthor | null;
  creator: JiraAuthor;
  reporter: JiraAuthor;
  created: string;
  updated: string;
  project: { id: string; key: string; name: string };
  issuetype: { id: string; name: string; subtask: boolean };
  labels: string[];
  fixVersions: { id: string; name: string }[];
  comment?: { comments: JiraComment[]; total: number; maxResults: number; startAt: number };
  issuelinks?: JiraIssueLink[];
  subtask?: boolean;
  parent?: { id: string; key: string; fields: { summary: string; status: { name: string } } };
  subtasks?: JiraIssue[];
  sprint?: JiraSprint;
  closedSprints?: JiraSprint[];
  worklog?: { worklogs: JiraWorklog[]; total: number; maxResults: number; startAt: number };
  attachment?: JiraAttachment[];
  changelog?: { entries: JiraChangelog[]; total: number };
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  expand: string;
  fields: JiraIssueFields;
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
  names: Record<string, string>;
  schemas: Record<string, string>;
}

export interface JiraSearchParams {
  jql: string;
  fields?: string[];
  startAt?: number;
  maxResults?: number;
  expand?: string[];
}

export interface SearchAllOptions {
  maxTotalResults?: number;
  onProgress?: (fetched: number, total: number) => void;
}
