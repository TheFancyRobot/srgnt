import { describe, it, expect } from 'vitest';
import {
  EmailString,
  UrlString,
  DateTimeString,
  DateTimeISOString,
  SemVerString,
  PositiveInt,
  UnknownRecord,
  StringRecord,
  NumberRecord,
  parseSync,
  safeParse,
} from './shared-schemas.js';

describe('EmailString', () => {
  it('accepts a valid email', () => {
    expect(() => parseSync(EmailString, 'user@example.com')).not.toThrow();
  });

  it('rejects an email with no @', () => {
    expect(() => parseSync(EmailString, 'userexample.com')).toThrow();
  });

  it('rejects an email with no domain', () => {
    expect(() => parseSync(EmailString, 'user@')).toThrow();
  });
});

describe('UrlString', () => {
  it('accepts a valid http URL', () => {
    expect(() => parseSync(UrlString, 'http://example.com')).not.toThrow();
  });

  it('accepts a valid https URL', () => {
    expect(() => parseSync(UrlString, 'https://example.com/path')).not.toThrow();
  });

  it('rejects a URL with no protocol', () => {
    expect(() => parseSync(UrlString, 'example.com')).toThrow();
  });

  it('rejects an ftp URL', () => {
    expect(() => parseSync(UrlString, 'ftp://example.com')).toThrow();
  });
});

describe('DateTimeString', () => {
  it('decodes a valid ISO string into a datetime value', () => {
    const result = parseSync(DateTimeString, '2024-01-15T10:30:00.000Z');
    expect(result).toBeDefined();
    expect(String(result)).toContain('2024-01-15T10:30:00.000Z');
  });

  it('rejects an invalid datetime string', () => {
    expect(() => parseSync(DateTimeString, 'not-a-datetime')).toThrow();
  });
});

describe('DateTimeISOString', () => {
  it('accepts a valid ISO8601 with milliseconds', () => {
    expect(() => parseSync(DateTimeISOString, '2024-01-15T10:30:00.000Z')).not.toThrow();
  });

  it('accepts a valid ISO8601 without milliseconds', () => {
    expect(() => parseSync(DateTimeISOString, '2024-01-15T10:30:00Z')).not.toThrow();
  });

  it('rejects an invalid format', () => {
    expect(() => parseSync(DateTimeISOString, '2024-01-15')).toThrow();
  });
});

describe('SemVerString', () => {
  it('accepts a valid semver "1.2.3"', () => {
    expect(() => parseSync(SemVerString, '1.2.3')).not.toThrow();
  });

  it('accepts a valid semver "0.0.1"', () => {
    expect(() => parseSync(SemVerString, '0.0.1')).not.toThrow();
  });

  it('rejects semver with "v" prefix', () => {
    expect(() => parseSync(SemVerString, 'v1.2.3')).toThrow();
  });

  it('rejects incomplete semver "1.2"', () => {
    expect(() => parseSync(SemVerString, '1.2')).toThrow();
  });
});

describe('PositiveInt', () => {
  it('accepts a positive integer', () => {
    expect(() => parseSync(PositiveInt, 5)).not.toThrow();
  });

  it('rejects zero', () => {
    expect(() => parseSync(PositiveInt, 0)).toThrow();
  });

  it('rejects a negative number', () => {
    expect(() => parseSync(PositiveInt, -3)).toThrow();
  });

  it('rejects a non-integer', () => {
    expect(() => parseSync(PositiveInt, 1.5)).toThrow();
  });
});

describe('parseSync', () => {
  it('returns the parsed value for valid input', () => {
    const result = parseSync(EmailString, 'user@example.com');
    expect(result).toBe('user@example.com');
  });

  it('throws for invalid input', () => {
    expect(() => parseSync(EmailString, 'invalid')).toThrow();
  });
});

describe('safeParse', () => {
  it('returns {success: true, data} for valid input', () => {
    const result = safeParse(EmailString, 'user@example.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('user@example.com');
    }
  });

  it('returns {success: false, error} for invalid input', () => {
    const result = safeParse(EmailString, 'not-an-email');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('Record schemas', () => {
  it('UnknownRecord accepts any values', () => {
    expect(() => parseSync(UnknownRecord, { a: 1, b: 'x', c: true })).not.toThrow();
  });

  it('StringRecord accepts string values', () => {
    expect(() => parseSync(StringRecord, { a: 'hello', b: 'world' })).not.toThrow();
  });

  it('NumberRecord accepts number values', () => {
    expect(() => parseSync(NumberRecord, { x: 1, y: 2.5 })).not.toThrow();
  });

  it('StringRecord rejects non-string values', () => {
    expect(() => parseSync(StringRecord, { a: 123 })).toThrow();
  });

  it('NumberRecord rejects non-number values', () => {
    expect(() => parseSync(NumberRecord, { x: '1' })).toThrow();
  });
});
