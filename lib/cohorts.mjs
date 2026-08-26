// cohorts.mjs — zetizeti's multi-tier cohort system, in ONE place.
//
// A signed-in user belongs to exactly ONE cohort tier, and the tier is the SINGLE fact that decides how
// their inference is paid for. Four tiers, one per key model:
//
//   AI_CLUB       — the AI Club (Foundation) students. Each has their OWN individual OpenRouter key,
//                   resolved per request by the credit engine (app #1); zetizeti does NOT meter them
//                   (usingPool=false). Membership: THE ENGINE'S OWN ROSTER, fetched from /cohort/members
//                   and refreshed periodically. ZETIZETI_AICLUB_ALLOWLIST is a break-glass fallback used
//                   only until the engine has answered once — it is NOT a second roster any more, and it
//                   was one until 26 August 2026, when the two silently drifted and a funded student
//                   could not sign in. /api/config reports which source is live.
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
// 🔴 PRECEDENCE IS A PREFERENCE ORDER, NOT AN EXCLUSIVE ASSIGNMENT (26 August 2026, Prayas: *"make all
// rosters consistent, all people on either list should be able to login. if they have credits on their
// key - they can use"*). Until this date the first match was also the LAST: an email on both the AI Club
// and the personal list resolved to AI_CLUB, asked the engine for a key, got NO_KEY, and was refused —
// never reaching the operator key it was put on the personal list to use. Nothing errored and nothing
// logged it. `tiersForUser` now returns EVERY tier the email qualifies for, in preference order, and the
// callers walk it: the first tier that can actually produce a key wins. Being on two lists is now
// additive, which is what a person reasonably expects a second list to mean.
//
// ⚠️ Only a MISSING KEY falls through. A hard refusal inside a tier — a ₹ ceiling reached, a revoked
// student — is a decision that tier made about that person and must not be escaped by dropping to the
// next wallet. Fall-through answers "this tier cannot pay for you"; it must never answer "this tier said
// no". Keep that distinction if you extend this.
//
// EXTENSIBLE BY DESIGN: a third cohort is a new TIER value + a membership predicate + a key model; the
// resolver returns it and the handlers switch on it, so adding one does not reshape the control flow.
// This module is the ONLY place that classifies a user — server.mjs asks tierForUser(), never the raw
// allowlist predicates, so the tiering can never drift between the chat path, the criticism path, and
// the status endpoints.

import {
  emailIsAiClub, emailAllowedOnPoolPersonal, emailAllowedOnPoolStudents,
  aiClubAllowlistConfigured, aiClubAllowlistSizeNow, aiClubRosterSource, aiClubRosterAgeSec,
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
export function tierForUser(email, opts = {}) {
  return tiersForUser(email, opts)[0];
}

// EVERY tier this email qualifies for, in preference order — the list `tierForUser` takes its head from.
// A caller that can retry (the chat path, the criticism path) walks this and takes the first tier that
// actually yields a key; a caller that only needs to describe the user (the status endpoints) reads the
// head. Always returns at least one element, so `[0]` is safe.
export function tiersForUser(email, { personalEnabled = false, studentsEnabled = false } = {}) {
  const tiers = [];
  if (creditEngineConfigured && emailIsAiClub(email)) tiers.push(TIER.AI_CLUB);              // own key — first
  if (personalEnabled && emailAllowedOnPoolPersonal(email)) tiers.push(TIER.POOL_PERSONAL);  // operator key
  if (studentsEnabled && emailAllowedOnPoolStudents(email)) tiers.push(TIER.POOL_STUDENTS);  // org key + caps
  return tiers.length ? tiers : [TIER.NONE];
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
      members: (aiClubRosterSource() === 'engine' || aiClubAllowlistConfigured) ? aiClubAllowlistSizeNow() : null,
      // WHERE the membership answer is coming from right now — 'engine' (the one roster) or 'env' (the
      // break-glass list, used only until the engine has answered once). The env copy silently drifting
      // out of step with the engine is the fault this whole mechanism removes, so the degraded state is
      // reported rather than inferred: if this ever reads 'env' on a running deployment, the engine is
      // not answering and the list in force may be stale.
      source: aiClubRosterSource(),
      rosterAgeSec: aiClubRosterAgeSec(),
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
