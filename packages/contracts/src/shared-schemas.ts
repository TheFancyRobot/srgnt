import { Schema } from "@effect/schema";
import { Either } from "effect";


export const EmailString = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
);

export const UrlString = Schema.String.pipe(
  Schema.pattern(/^https?:\/\/.+/)
);

export const DateTimeString = Schema.DateTimeUtc;

export const DateTimeISOString = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
);

export const SemVerString = Schema.String.pipe(
  Schema.pattern(/^\d+\.\d+\.\d+$/)
);

export const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown });

export const StringRecord = Schema.Record({ key: Schema.String, value: Schema.String });

export const NumberRecord = Schema.Record({ key: Schema.String, value: Schema.Number });

export const PositiveInt = Schema.Number.pipe(Schema.int(), Schema.positive());

export function parseSync<A>(schema: Schema.Schema<A, any, any>, value: unknown): A {
  return Schema.decodeUnknownSync(schema as Schema.Schema<A, any, never>)(value);
}

export function safeParse<A>(schema: Schema.Schema<A, any, any>, value: unknown):
  | { success: true; data: A }
  | { success: false; error: unknown } {
  const either = Schema.decodeUnknownEither(schema as Schema.Schema<A, any, never>)(value);
  if (Either.isRight(either)) {
    return { success: true, data: either.right };
  }
  return { success: false, error: either.left };
}

