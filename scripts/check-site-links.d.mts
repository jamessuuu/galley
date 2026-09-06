// Types for scripts/check-site-links.mjs so the TypeScript test suite can
// import it under NodeNext resolution. Keep in step with the .mjs exports.

export interface GithubTarget {
  owner: string;
  repo: string;
  branch: string;
}

export interface SiteConfig {
  repoRoot: string;
  outputDir: string;
  build: string | null;
  ignoreFile: string | null;
  github: GithubTarget;
}

export interface Ref {
  tag: string;
  attr: 'href' | 'src' | 'poster';
  value: string;
}

export type Rule = 'escapes-output' | 'missing-in-output' | 'not-deployed' | 'github-path';

export interface Violation extends Ref {
  page: string;
  rule: Rule;
  detail: string;
}

export const SITE: Readonly<SiteConfig>;
export function ensureSiteBuilt(site?: SiteConfig): void;
export function readIgnoreList(file: string | null): string[];
export function isIgnored(relPosix: string, ignore: readonly string[]): boolean;
export function extractRefs(html: string): Ref[];
export function classifyRef(value: string): 'skip' | 'external' | 'local';
export function scanSite(site?: SiteConfig): Violation[];
export function main(site?: SiteConfig): void;
