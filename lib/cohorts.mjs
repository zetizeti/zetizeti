// cohorts.mjs — zetizeti's multi-tier cohort system, in ONE place.
//
// A signed-in user belongs to exactly ONE cohort tier, and the tier is the SINGLE fact that decides how
// their inference is paid for. Four tiers, one per key model:
//
//   AI_CLUB       — the AI Club (Foundation) students. Each has their OWN individual OpenRouter key,
//                   resolved per request by the credit engine (app #1); zetizeti does NOT meter them
//                   (usingPool=false). Membership: ZETIZETI_AICLUB_ALLOWLIST (+ the engine configured).
//
//   POOL_PERSONAL — the operator + trusted personal accounts. They draw on the operator's OWN key
//                   (OPENROUTER_API_KEY): OWN-KEY billing — NO cohort ₹ ceiling, NO metering (like an AI
//                   Club key, but a shared operator key rather than per-user). Membership:
//                   ZETIZETI_POOL_ALLOWLIST_PERSONAL (a small env-var list). Empty = closed.
//
//   POOL_STUDENTS — the student cohort. They SHARE the ORG key (OPENROUTER_API_KEY_ORG), metered BY
//                   zetizeti against the ₹ ceiling + per-user daily turn allowance (the pilot). One org
//                   key, one budget, split across the cohort. Membership: a file-backed roster
//                   (pool-allowlist-students.md, via ZETIZETI_POOL_ALLOWLIST_STUDENTS). Empty = closed.
//
//   NONE          — signed in but in no cohort → refused (there is no user-supplied-key fallback).
//
// PRECEDENCE: AI_CLUB > POOL_PERSONAL > POOL_STUDENTS. A user on more than one list is served the
// earliest match — their own / the operator key before the shared org key — so the cohorts never
// contend for the same wallet, and personal testing never spends the student ₹ budget.
//
// EXTENSIBLE BY DESIGN: a third cohort is a new TIER value + a membership predicate + a key model; the
// resolver returns it and the handlers switch on it, so adding one does not reshape the control flow.
// This module is the ONLY place that classifies a user — server.mjs asks tierForUser(), never the raw
// allowlist predicates, so the tiering can never drift between the chat path, the criticism path, and
// the status endpoints.

import {
  emailIsAiClub, emailAllowedOnPoolPersonal, emailAllowedOnPoolStudents,
  aiClubAllowlistConfigured, aiClubAllowlistSize,
  personalAllowlistConfigured, personalAllowlistSize,
  studentsAllowlistConfigured, studentsAllowlistSize,
} from './auth.mjs';
import { creditEngineConfigured } from './credit-engine.mjs';

// The shared-pool tier is BIFURCATED (11 Jul 2026): POOL_PERSONAL (operator's own key, own-key billing)
// and POOL_STUDENTS (the org key, metered against the ₹ pilot ceiling). Each has its OWN allowlist + key.
export const TIER = Object.freeze({
  AI_CLUB: 'ai-club', POOL_PERSONAL: 'pool-personal', POOL_STUDENTS: 'pool-students', NONE: 'none',
});

// The single source of truth: which tier is this signed-in user in? The `*Enabled` flags (is the
// relevant key — and, for students, a ceiling — configured?) are server-runtime facts, passed in.
// PRECEDENCE: AI_CLUB > POOL_PERSONAL > POOL_STUDENTS. A user on more than one list is served the
// earliest match (their own key / the operator key before the shared org key).
export function tierForUser(email, { personalEnabled = false, studentsEnabled = false } = {}) {
  if (creditEngineConfigured && emailIsAiClub(email)) return TIER.AI_CLUB;              // own key — first
  if (personalEnabled && emailAllowedOnPoolPersonal(email)) return TIER.POOL_PERSONAL;  // operator key
  if (studentsEnabled && emailAllowedOnPoolStudents(email)) return TIER.POOL_STUDENTS;  // org key + caps
  return TIER.NONE;
}

// The key model behind each tier — for the boot log, /api/config, and docs. Not behaviour; description.
export const KEY_MODEL = Object.freeze({
  [TIER.AI_CLUB]: 'individual key · own credit, shared across AI Club apps',
  [TIER.POOL_PERSONAL]: 'operator personal key · own-key billing, no cohort ceiling',
  [TIER.POOL_STUDENTS]: 'shared org key · metered against the ₹ pilot ceiling + per-user caps',
  [TIER.NONE]: 'no access',
});

// A capabilities summary (no specific user) for /api/config + the boot log: is each tier wired, and how
// large is its allowlist. `members: null` means the allowlist is unset/empty (that tier admits no one —
// both pool tiers are closed-by-default now; only AI Club's null also means "routing off").
export function cohortSummary({ personalEnabled = false, studentsEnabled = false } = {}) {
  return {
    aiClub: {
      routing: creditEngineConfigured,
      members: aiClubAllowlistConfigured ? aiClubAllowlistSize : null,
    },
    personal: {
      enabled: !!personalEnabled,
      members: personalAllowlistConfigured ? personalAllowlistSize : null,
    },
    students: {
      enabled: !!studentsEnabled,
      members: studentsAllowlistConfigured ? studentsAllowlistSize : null,
    },
  };
}
