import { describe, it, expect } from 'vitest';
import { extractTableShareId } from './tableShareUrl';

describe('extractTableShareId', () => {
  it('pulls the code from a full share URL', () => {
    expect(extractTableShareId('https://donorcompass.rethinkpriorities.org/#table&s=Q1CB7fp')).toBe(
      'Q1CB7fp'
    );
  });

  it('pulls the code from a bare hash fragment', () => {
    expect(extractTableShareId('#table&s=Q1CB7fp')).toBe('Q1CB7fp');
  });

  it('accepts a bare code', () => {
    expect(extractTableShareId('Q1CB7fp')).toBe('Q1CB7fp');
  });

  it('trims surrounding whitespace', () => {
    expect(extractTableShareId('  Q1CB7fp \n')).toBe('Q1CB7fp');
  });

  it('handles a ?s= query form', () => {
    expect(extractTableShareId('https://example.com/?s=abc123')).toBe('abc123');
  });

  it('stops at the next & so trailing params are dropped', () => {
    expect(extractTableShareId('#table&s=abc123&foo=bar')).toBe('abc123');
  });

  it('returns null for input with no code', () => {
    expect(extractTableShareId('https://donorcompass.rethinkpriorities.org/#table')).toBeNull();
  });

  it('returns null for a malformed URL with no code', () => {
    expect(extractTableShareId('not a share link')).toBeNull();
  });

  it('returns null for empty or non-string input', () => {
    expect(extractTableShareId('')).toBeNull();
    expect(extractTableShareId('   ')).toBeNull();
    expect(extractTableShareId(null)).toBeNull();
    expect(extractTableShareId(undefined)).toBeNull();
  });
});
