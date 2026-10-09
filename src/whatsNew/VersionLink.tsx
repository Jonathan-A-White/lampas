// src/whatsNew/VersionLink.tsx: the link from About to this version's heading in CHANGELOG.md on GitHub
// (bsv-kit's versionLink: a public repo only; a private repo has no link and About's own list is the answer).
import { versionLink } from 'bsv-kit/whats-new';
import { APP_SEMVER, REPO, REPO_PUBLIC } from '../config';

export function VersionLink({ repo = REPO, isPublic = REPO_PUBLIC, version = APP_SEMVER }: { repo?: string; isPublic?: boolean; version?: string }) {
  const href = versionLink({ repo, public: isPublic, version });
  if (!href) return null;
  return (
    <p className="pb-2 text-center text-base">
      <a data-testid="version-link" href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-accent underline">
        What changed in {version}, on GitHub
      </a>
    </p>
  );
}
