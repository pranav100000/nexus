import { describe, it, expect } from 'vitest';
import { validateGitRef } from '../../context/git.js';

describe('validateGitRef', () => {
  it('accepts branch names', () => {
    expect(() => validateGitRef('main')).not.toThrow();
    expect(() => validateGitRef('feature/my-branch')).not.toThrow();
    expect(() => validateGitRef('release/v1.0.0')).not.toThrow();
  });

  it('accepts SHA hashes', () => {
    expect(() => validateGitRef('abc1234')).not.toThrow();
    expect(() => validateGitRef('4b825dc642cb6eb9a060e54bf899d15363d7aa82')).not.toThrow();
  });

  it('accepts relative refs', () => {
    expect(() => validateGitRef('HEAD~1')).not.toThrow();
    expect(() => validateGitRef('HEAD^2')).not.toThrow();
    expect(() => validateGitRef('main@{upstream}')).not.toThrow();
    expect(() => validateGitRef('HEAD')).not.toThrow();
  });

  it('rejects refs starting with -', () => {
    expect(() => validateGitRef('--upload-pack=evil')).toThrow('must not start with');
    expect(() => validateGitRef('-n')).toThrow('must not start with');
    expect(() => validateGitRef('--exec=whoami')).toThrow('must not start with');
  });

  it('rejects refs with whitespace', () => {
    expect(() => validateGitRef('main branch')).toThrow('must not contain whitespace');
    expect(() => validateGitRef('main\tbranch')).toThrow('must not contain whitespace');
    expect(() => validateGitRef('main\nbranch')).toThrow('must not contain whitespace');
  });

  it('rejects refs with null bytes', () => {
    expect(() => validateGitRef('main\0evil')).toThrow('must not contain whitespace or null');
  });
});
