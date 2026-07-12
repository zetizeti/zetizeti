# Sign-off review sheet — game-design.md, 17 pending entries (25 May 2026)

> **Purpose:** one place for Prayas's **Gate 4 (human sign-off)** on the new **game-design** corpus
> (`app/corpus/domain/game-design.md`). Every entry below has cleared the full **four-pass**: Pass 4
> (citations verified live against Crossref/publisher — `citation-verifier`, 25 May), the Consensus
> framing check where the claim is empirical, and the three analytical passes (factual/copyright ·
> logical/de-gotcha · philosophical/SDC). None is tagged `verified` until you sign it off here.
>
> **To sign off an entry:** delete its `**provenance:** pending` line in `game-design.md`. *Verified =
> the absence of that line* — retrieval defaults absent provenance to `verified`, and the curtain
> then shows `✓` instead of `◔`. You may also trim the `framing_confidence` verification notes.
> **To send back:** leave it `pending` and note what to change.
>
> **Legend:** P4 = citation Pass-4 verified (live) · C = Consensus-checked (empirical claim) ·
> 3P = three analytical passes · 4P = the above as one four-pass run. **"Outstanding"** = what blocks
> `verified` beyond your judgement.
>
> **At a glance:** **all 17 are clean and ready for your decision** — no citation, copyright, or
> two-sidedness blocker survives the passes. 10 of 17 carried a verdict-leak or de-gotcha flag from
> Pass 2/3 that was **fixed in place before sign-off** (these are pending, never-live entries, so the
> passes' neutralising rewrites were applied directly — full log at the foot of this sheet so you can
> review or revert any). The two empirical entries (flow, gamification) are the most heavily hedged.

---

## The structural decisions (read once, they govern the whole file)

- **Own file, but tagged `discipline: interaction-design`.** Game design lives in its own file for
  coherence and tracking, but every entry is tagged `interaction-design` (not `game-design`) — your
  explicit decision (25 May): it surfaces whenever a student selects **Interaction Design** (and under
  "All disciplines"), and is **not** to become a separate eighth discipline in the dropdown. The file
  header documents this so a future session doesn't "correct" the tag. *No `public/index.html` change
  was made — none is wanted.*
- **Centre of gravity is digital/interactive** (your steer), with board/tabletop grounding where the
  tension is shared: `the-unnecessary-obstacle`, `uncertainty-and-chance`, `balance-and-asymmetry`,
  `paidia-and-ludus`, `the-magic-circle`.
- **Co-retrieval note.** Because these carry the `interaction-design` tag, they surface *alongside*
  the existing interaction-design entries. Pass 2 confirmed no true duplication, and de-overlapped the
  retrieval surface of the one risky pair (see `emergence-or-progression` / `paidia-and-ludus` below).
  Three deliberate complementary pairings remain (game `the-unnecessary-obstacle` ↔ IxD
  `friction-and-frictionlessness`; game `the-compulsion-loop` ↔ IxD `dark-patterns-and-ethics`; game
  `agency-and-authored-experience` ↔ IxD `direct-manipulation-vs-agents`) — distinct axes, not dupes.

---

# WHAT MAKES PLAY WORK (5)

## 1. meaningful-play · interaction-design
- **Sources:** Salen & Zimmerman, *Rules of Play: Game Design Fundamentals* (MIT Press, **2003**).
- **Tension:** meaningful play = a choice whose outcome is **discernable** + **integrated** (S&Z) vs the value of low-stakes, ambient, "pointless" interaction in making a world feel inhabited.
- **Questions:** When the player makes this choice, can they tell what it did — and will it matter later? · Does this action need to be meaningful, or is it doing something else — texture, rhythm, breathing room?
- **Status:** P4 ✓ (year **2003**, not 2004) · 3P ✓ — *fixed:* "are noise" → "fail one test or the other"; "integrated" broadened beyond the purely temporal reading (Pass 1/3).
- **Outstanding:** none. **Ready. Sign-off ☐**

## 2. mechanics-dynamics-aesthetics · interaction-design
- **Sources:** Hunicke, LeBlanc & Zubek, "MDA: A Formal Approach to Game Design and Game Research", Challenges in Game AI Workshop, 19th National Conf. on AI (AAAI Press, 2004).
- **Tension:** designer builds mechanics → dynamics → aesthetics; player meets them in reverse — so you never author a feeling directly, only the rules that might produce it. Counter: experience also comes from fiction/art/sound/social setting, none reducible to mechanics.
- **Questions:** Is the thing you want to change a matter of the rules, of how they behave once people play, or of how it feels — and which are you actually working on? · What is carrying the experience here that no rule of yours controls?
- **Status:** P4 ✓ (opposite-traversal claim confirmed in the paper) · 3P ✓ (clean — model two-sided entry).
- **Outstanding:** none. **Ready. Sign-off ☐**

## 3. fun-as-learning · interaction-design
- **Sources:** Koster, *A Theory of Fun for Game Design* (Paraglyph Press, 2004; 2nd ed. O'Reilly, 2013).
- **Tension:** Koster — fun *is* the brain mastering a pattern, so a solved game goes boring vs fun also = social/aesthetic/competitive/ritual pleasure that outlasts the learning curve.
- **Questions:** When this stops being fun, is it because the player has finished learning it — or for some other reason? · What keeps people here after the learning curve flattens — mastery, each other, the story, the ritual — and is the design feeding that?
- **Status:** P4 ✓ · 3P ✓ — framed explicitly as "Koster argues", **not** as established cognitive science (verifier flagged it as a popular-press thesis).
- **Outstanding:** none. **Ready. Sign-off ☐**

## 4. game-feel-and-juiciness · interaction-design
- **Sources:** Swink, *Game Feel: A Game Designer's Guide to Virtual Sensation* (Morgan Kaufmann/Elsevier, **2009**).
- **Tension:** real-time tactile "feel" / juice as a primary, often-decisive layer of digital play vs juice as a substitute for substance that flatters thin mechanics.
- **Questions:** Is what's missing here a matter of how it *feels* to act — responsiveness, feedback, weight — or of what there is to do? · If you added all the juice you could, would the game be better, or just better at hiding what's thin?
- **Status:** P4 ✓ (keep **2009**; a 2008 catalogue variant exists) · 3P ✓ — *fixed:* the counter-pole's moralised "empty stimulation engineered to feel rewarding" softened (Pass 3).
- **Outstanding:** none. **Ready. Sign-off ☐**

## 5. procedural-rhetoric · interaction-design
- **Sources:** Bogost, *Persuasive Games: The Expressive Power of Videogames* (MIT Press, 2007).
- **Tension:** games make arguments through their *procedures* (a model the player operates) vs players optimise/misread the system, and meaning also lives in fiction/art/writing.
- **Questions:** What is the *system* you've built claiming about the world — separately from anything the story says? · A player trying hard to win — what do they actually take away from the system you built: the claim you meant, or something else?
- **Status:** P4 ✓ ("procedural rhetoric" = Bogost's coinage) · 3P ✓ — *fixed:* "hands a designer real expressive power" → "on Bogost's account…" (Pass 3); leading Q2 "optimise straight through it" de-gotcha'd (Pass 2).
- **Outstanding:** none. **Ready. Sign-off ☐**

---

# HOW HARD, HOW OPEN (5)

## 6. flow-or-designed-difficulty · interaction-design
- **Sources:** Csikszentmihalyi, *Flow: The Psychology of Optimal Experience* (Harper & Row, 1990); Juul, *The Art of Failure: An Essay on the Pain of Playing Video Games* (MIT Press, 2013).
- **Tension:** tune challenge/skill to the flow channel (smooth absorption) vs Juul — the pain of failure is part of why winning means anything; designed difficulty makes meaning flow can't.
- **Questions:** Is this difficulty there to keep the player absorbed, or to make what they achieve mean something — and are those the same here? · If you smoothed this frustration away, what would change in what the player feels when they finally get it — and would something be lost, or nothing?
- **Status:** P4 ✓ · **C ✓** — Consensus: flow's challenge–skill balance is only *partially* supported and the four-channel model is directly challenged (Engeser & Rheinberg 2008; Lambert et al. 2013), so flow is framed as a **contested** target, not settled science. 3P ✓ — *fixed:* closing "the very thing that makes mastering it matter" (presupposed Juul) → two-way; Q2 opened to "lost, or nothing" (Pass 3).
- **Outstanding:** none. `framing_confidence: medium` by design (empirical contest). **Ready. Sign-off ☐**

## 7. the-unnecessary-obstacle · interaction-design
- **Sources:** Suits, *The Grasshopper: Games, Life and Utopia* (University of Toronto Press, 1978).
- **Tension:** Suits — a game *is* the voluntary attempt to overcome unnecessary obstacles (the *lusory attitude*); remove the friction and you remove the game vs not all inefficiency is a beloved obstacle — some is just bad design players tolerate.
- **Questions:** Is this difficulty the obstacle players actually came to overcome, or friction they are putting up with to get to the game? · If you let them take the efficient shortcut, would the game get better — or would there be no game left?
- **Status:** P4 ✓ (short Suits phrase is genuine; framed as his idea) · 3P ✓ — *fixed:* added the *lusory-attitude* clause (source line had promised it; Pass 1); "sacred 'challenge'" sneer-word neutralised (Pass 3).
- **Outstanding:** none. **Ready. Sign-off ☐** *(Complements IxD `friction-and-frictionlessness`, not a duplicate — there friction is a guardrail on a task; here the obstacle is the activity.)*

## 8. emergence-or-progression · interaction-design
- **Sources:** Juul, "The Open and the Closed: Games of Emergence and Games of Progression", in Mäyrä (ed.), *Computer Games and Digital Cultures Conf. Proceedings* (Tampere UP, 2002), 323–329; Juul, *Half-Real* (MIT Press, 2005).
- **Tension:** few rules → vast possibility space (chess, Go, *The Sims*, roguelikes) but unpredictable/hard to balance vs an authored sequence of challenges — controllable but hand-built and largely spent once.
- **Questions:** Does the experience you want come from rules combining in ways you didn't script, or from a sequence you author and control? · What are you willing to pay — the unpredictability of emergence, or content that is largely spent after one play?
- **Status:** P4 ✓ (pp. 323–329, ed. Mäyrä) · 3P ✓ (clean) — *retrieval de-overlapped* vs `paidia-and-ludus`: this entry now owns `content/systems/replayability/roguelike`; "sandbox/open" moved to paidia (Pass 2).
- **Outstanding:** none. **Ready. Sign-off ☐**

## 9. paidia-and-ludus · interaction-design
- **Sources:** Caillois, *Man, Play and Games*, trans. Barash (Free Press, 1961; orig. *Les jeux et les hommes*, Gallimard, 1958).
- **Tension:** free, improvised play (a toy, a sandbox) — open but possibly aimless vs rule-bound, goal-directed play (a contest) — focused but possibly rigid.
- **Questions:** Is this offering a toy to play *with* or a contest to *win* — and does its structure match that? · Where players feel aimless or boxed in, is it because there is too little structure for the play you want, or too much?
- **Status:** P4 ✓ (Barash trans.; 1958 Gallimard / 1961 Free Press) · 3P ✓ (clean, exemplary neutrality).
- **Outstanding:** none. Distinct from `emergence-or-progression` (that = where content comes from; this = the player's *mode* of play). **Ready. Sign-off ☐**

## 10. balance-and-asymmetry · interaction-design
- **Sources:** Schreiber & Romero, *Game Balance* (A K Peters/CRC Press, 2021).
- **Tension:** balance so no single choice dominates (symmetry is the clean route — chess) vs asymmetry, where richness/character/replayability live but "fair" means "different yet equally viable", which is hardest to balance.
- **Questions:** Is the variety you want here worth the balancing it will cost — and can you keep the differences while keeping them viable? · When one option looks "best", is that a flaw to fix, or difference that is fair in a way "identical" wouldn't be?
- **Status:** P4 ✓ (cited as the field's reference, **not** the origin of the dominant-strategy idea) · 3P ✓ (clean).
- **Outstanding:** none. `framing_confidence: medium` (textbook treatment, not coinage). **Ready. Sign-off ☐**

---

# STORY, SYSTEM & MEANING (2)

## 11. story-or-system · interaction-design
- **Sources:** Murray, *Hamlet on the Holodeck* (Free Press, 1997); Aarseth, *Cybertext* (Johns Hopkins UP, 1997); Juul, *Half-Real* (MIT Press, 2005).
- **Tension:** games as a narrative medium (Murray) vs games as rule-systems the fiction dresses (Aarseth/Juul) — leading with story risks "chores between cutscenes"; leading with system risks cold, thin fiction; the two can also reinforce.
- **Questions:** What does the story do here that the system can't, and what does the system do that the story can't — and which is the player actually here for? · Where the two meet, do they reinforce each other, or is one fighting the other?
- **Status:** P4 ✓ · 3P ✓ — *fixed:* "fiction *merely* dresses" → "dresses" (Pass 3); Q1 "what is *really* carrying this — story *or* system?" reframed off the false either/or (Pass 2). Deliberately declines the overblown "ludology vs narratology war" caricature.
- **Outstanding:** none. **Ready. Sign-off ☐**

## 12. agency-and-authored-experience · interaction-design
- **Sources:** Murray, *Hamlet on the Holodeck: The Future of Narrative in Cyberspace* (Free Press, 1997).
- **Tension:** *agency* (Murray) — the pull toward more player freedom/consequence vs authorship — pacing, surprise, a crafted arc (the "narrative paradox"); total freedom can leave nothing the designer cared about reliably happening.
- **Questions:** Where in this design does the player's felt power to *act* matter most — and where does the shape of an experience you author matter more? · Is the freedom you're offering real consequence, or the appearance of choice the player will see through?
- **Status:** P4 ✓ · 3P ✓ (clean) — framing note now distinguishes it from both IxD `direct-manipulation-vs-agents` (manipulation vs delegation) **and** `story-or-system` (medium-identity), keeping this on the freedom-vs-authored-arc axis (Pass 2).
- **Outstanding:** none. **Ready. Sign-off ☐**

---

# PLAY AS A BOUNDED WORLD (1)

## 13. the-magic-circle · interaction-design
- **Sources:** Huizinga, *Homo Ludens* (1938; Eng. Routledge & Kegan Paul, 1949); Salen & Zimmerman, *Rules of Play* (2003); Consalvo, "There Is No Magic Circle", *Games and Culture* 4(4) (2009).
- **Tension:** the bounded play-space as a protected zone where players can experiment/fail/role-play without ordinary consequence vs Consalvo — the boundary is porous (money, reputation, emotion, harassment cross it), so treating it as sealed overlooks real stakes some games carry.
- **Questions:** What does treating this as "inside the game, so it doesn't count" give the people playing — what can they do here that they couldn't if it counted? · And where it counts anyway — money, feelings, reputation crossing back out — has the design noticed, or is it leaning on a boundary that isn't holding?
- **Status:** P4 ✓ (Consalvo DOI 10.1177/1555412009343575; Huizinga subtitle "in **Culture**") · 3P ✓ — **this was Pass 2/3's top flag and is now fixed:** title trimmed `the-magic-circle-and-its-leakage` → `the-magic-circle`; "licenses a designer to ignore…" → "frames…"; "pushes hard the other way" → "argues"; "stakes their game *actually* carries" → "stakes some games carry"; **both questions rebalanced** so one now articulates what the protected space *gives* players (was previously two leakage-questions = "it's just a game" set up as a strawman).
- **Outstanding:** none — but this is the entry whose framing moved most, so worth your eye. **Ready. Sign-off ☐**

---

# THE ETHICS OF ENGAGEMENT (2) — values-adjacent, keep both poles weighted

## 14. extrinsic-rewards-and-gamification · interaction-design
- **Sources:** Deterding, Dixon, Khaled & Nacke, "From Game Design Elements to Gamefulness: Defining 'Gamification'", MindTrek '11 (ACM, 2011); Deci, *JPSP* 18(1) (1971); Lepper, Greene & Nisbett, *JPSP* 28(1) (1973).
- **Tension:** points/badges/leaderboards reliably drive behaviour and are genuinely useful in some contexts vs the overjustification effect — extrinsic reward can crowd out the intrinsic motivation it borrows from.
- **Questions:** What already motivates someone to do this — and would the reward you're adding strengthen that motive, or substitute for it? · If you removed the points tomorrow, what would people still do, and what would stop?
- **Status:** P4 ✓ (DOIs confirmed) · **C ✓** — overjustification is empirically real but **conditional** (near-zero mean in one quantitative review; strongest for tangible/expected rewards, reversed for informational feedback), so framed as "a caution, not a law". 3P ✓ (clean — exemplary handling of a near-virtuous topic).
- **Outstanding:** none. **The framing note firewalls zetizeti's own anti-gamification stance (invariant #6) as a *product* decision, not a corpus verdict** — please confirm you're happy with that separation. **Ready. Sign-off ☐**

## 15. the-compulsion-loop · interaction-design
- **Sources:** Schüll, *Addiction by Design: Machine Gambling in Las Vegas* (Princeton UP, 2012); cf. Deterding et al. (2011).
- **Tension:** the reward loop as the engine of immersion/flow (a well-tuned roguelike, a sport — the pull is the play) vs Schüll's machine-gambling lineage — variable-ratio reinforcement tuned to *time on device*, the line behind loot boxes/gacha/streaks. The line is *whose interest it serves*, not the mechanic.
- **Questions:** Is this loop optimised for the player's enjoyment, or for their continued presence and spend — and are those the same here? · Someone deep in this loop, stepping back from it later — what would they say the time gave them?
- **Status:** P4 ✓ · 3P ✓ — *fixed:* closing "would they, on reflection, be glad of it" (smuggled a reflective-endorsement *criterion*) → "how would they tell those two apart"; added a concrete *benign* example (roguelike/sport) to match the exploitative catalogue (Pass 3); Q2 trap-coding softened.
- **Outstanding:** none. `framing_confidence: medium` (applying Schüll to games is "the lineage behind", not a claimed equivalence). Distinct from IxD `dark-patterns-and-ethics` (reward-schedule/compulsion vs interface deception). **Ready. Sign-off ☐**

---

# PLAYERS & CHANCE (2)

## 16. player-types · interaction-design
- **Sources:** Bartle, "Hearts, Clubs, Diamonds, Spades: Players Who Suit MUDs", *Journal of MUD Research* 1(1) (1996).
- **Tension:** taxonomies (achievers/explorers/socialisers/killers) usefully name whose pleasures a design serves vs they flatten — a single player moves between types; the model is MUD-derived and may not transfer.
- **Questions:** When you picture "the player" of this, whose pleasures are you serving — and whose are you leaving out? · Does naming a player type help you see them more clearly, or let you stop seeing the messier person who'll actually play?
- **Status:** P4 ✓ (1996, *Journal of MUD Research*; born-digital, no DOI — cite URL) · 3P ✓ — *fixed:* title `player-types-and-their-flattening` → `player-types` (the old title was itself a verdict; body stays balanced, Pass 3).
- **Outstanding:** none. **Ready. Sign-off ☐**

## 17. uncertainty-and-chance · interaction-design
- **Sources:** Costikyan, *Uncertainty in Games* (MIT Press, 2013).
- **Tension:** uncertainty sustains a game (no uncertainty → no reason to play), from many sources — randomness keeps outcomes open and welcomes newcomers vs too much chance severs skill from outcome (why chess/Go use none; poker/backgammon build depth on it).
- **Questions:** Where does the uncertainty in this game actually come from — chance, hidden information, the opponent, or the player's own skill? · Is the randomness here opening the game up and keeping it alive, or loosening the link between what a player does and how well they do?
- **Status:** P4 ✓ (Playful Thinking series) · 3P ✓ — *fixed:* truncated Q2 ("how they do?" → "how well they do?", Pass 1/2); chess/Go prestige-anchor balanced with poker/backgammon; "quietly dissolving" de-loaded (Pass 3).
- **Outstanding:** none. **Ready. Sign-off ☐**

---

## Verification-edit log — what was changed in the passes (review or revert any)

These pending entries were de-loaded in place after the three analytical passes (the passes exist to
make an entry meet the two-sided / de-gotcha / no-smuggled-verdict bar before it ever reaches you).
Every change is recorded here against the pass that flagged it, with the original wording, so you can
revert at sign-off. Citations themselves were **not** altered — only framing/wording.

- **meaningful-play** — "most 'choices' … are noise" → "many 'choices' … fail one test or the other"; "integrated (it matters to the larger game later)" → "(it connects into the larger system of the game's actions and outcomes, including later)". *(Pass 1 + Pass 3.)*
- **the-magic-circle** — renamed from `the-magic-circle-and-its-leakage`; "licenses a designer to treat … consequence-free zone" → "frames the game world as a protected zone where players can experiment, fail and role-play"; "Consalvo … pushes hard the other way" → "argues the other way"; "the real-world harms and stakes their game actually carries" → "the real-world stakes some games carry"; both questions rewritten so one defends the protected space. *(Pass 2 SEV-1 + Pass 3 #1 — the most-moved entry.)*
- **flow-or-designed-difficulty** — closing "remove the very thing that makes mastering it matter" → "remove something that makes mastering it matter, or an obstacle that was never serving the player at all"; Q2 → "would something be lost, or nothing?". *(Pass 3 #4.)*
- **the-unnecessary-obstacle** — added the *lusory-attitude* clause to the body; "defending … friction as sacred 'challenge'" → "as essential 'challenge' when it is incidental". *(Pass 1 + Pass 3.)*
- **procedural-rhetoric** — "This hands a designer real expressive power" → "On Bogost's account this gives a designer a distinctive expressive channel"; Q2 "do they meet your argument, or optimise straight through it?" → "what do they actually take away … the claim you meant, or something else?". *(Pass 2 + Pass 3 #6.)*
- **story-or-system** — "fiction *merely* dresses" → "fiction dresses"; Q1 "what is *really* carrying this — the story, or the system?" → "what does the story do that the system can't, and vice versa — and which is the player here for?". *(Pass 2 SEV-5 + Pass 3 #7.)*
- **agency-and-authored-experience** — framing note extended to distinguish it from `story-or-system` (no body change). *(Pass 2 SEV-4.)*
- **game-feel-and-juiciness** — "at its worst function as empty stimulation engineered to feel rewarding regardless of whether anything meaningful is happening" → "lavish feedback can make a shallow game feel momentarily satisfying — papering over how little there is to do, and flattering thin mechanics". *(Pass 3 #5.)*
- **emergence-or-progression** — removed `sandbox` from vocabulary + dropped the "open or set levels" felt-as clause, so it no longer co-fires with `paidia-and-ludus` on generic "open vs structured" queries (now owns content/systems/replay register). *(Pass 2 SEV-3.)*
- **player-types** — renamed from `player-types-and-their-flattening` (title was a verdict). *(Pass 3 #3.)*
- **uncertainty-and-chance** — truncated Q2 fixed ("how they do?" → "how well they do?"); chess/Go balanced with poker/backgammon; "quietly dissolving the skill" → "loosening the link between the skill … and how the game turns out". *(Pass 1 + Pass 2 + Pass 3.)*
- **the-compulsion-loop** — added a concrete benign example (roguelike/sport); closing "whether someone caught in it would, on reflection, be glad of it" → "how they would tell those two apart in their own game"; Q2 trap-coding softened. *(Pass 3 #2.)*

**Not changed (Pass-verified clean):** `mechanics-dynamics-aesthetics`, `fun-as-learning`,
`extrinsic-rewards-and-gamification`, `paidia-and-ludus`, `balance-and-asymmetry`,
`agency-and-authored-experience` (body). Clinical-register check (does any entry diagnose the *learner*
rather than the *design*?): **zero violations across all 17**.

---

*Backing + four-pass run record: `app/verification-consensus-backing.md` (game-design section).
Gate mechanics: `verification-workflow.md`, `architecture.md §3a`. Tracker: `corpus-build-tracker.md`.*
