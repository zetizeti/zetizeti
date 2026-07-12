# Sign-off review sheet — 44 pending entries (25 May 2026, batch B3)

> **Purpose:** one place for Prayas's **Gate 4 (human sign-off)**. Every entry below has cleared
> the four-pass adversarial verification gate (architecture.md §3a) — Pass 1 (factual/citation
> grounding + copyright), Pass 2 (logical parsing), Pass 3 (philosophical/SDC parsing), Pass 4
> (mandatory live citation verification against Crossref / publisher / Open Library). Where the
> claim is empirical, the entry was additionally Consensus-checked and held two-sided. None is
> tagged `verified` until you sign it off here.
>
> **To sign off an entry:** delete its `**provenance:** pending` line in the corpus file. *Verified =
> the absence of that line* — retrieval defaults absent provenance to `verified`, and the curtain
> then shows `✓` instead of `◔`. You may also trim the `framing_confidence` verification notes.
> **To send back:** leave it `pending` and note what to change.
>
> **Legend:** P4 = citation Pass-4 verified (live lookup) · C = Consensus-checked (empirical
> claim, held two-sided) · 3P = three analytical passes cleared.
>
> **At a glance:** 41 of 44 are clean and ready for your decision; **3 carry a specific outstanding
> item or note**: `passion-or-paycheck` (Pass 2/3 split — you adjudicate Q2 tail),
> `the-second-hand-and-its-afterlife` (Brooks 2015/2025 cosmetic clarification), and
> `maintenance-over-innovation` (Pass 4 publisher correction, now reading correctly — note only,
> no action). `freelance-or-employed` also carries a Pass 4 author correction now reading
> correctly (Burger, not Rietveld) — note only, no action.
>
> **Standing note from the four-pass record.** Pass 4 honestly disclosed **11 cited works it did
> not independently re-look-up** this run (relied on header or prior-pass verification). A
> confirmatory spot-check at sign-off could close them — your call which entries to probe.
> Separately, Pass 2 and Pass 3 surfaced an **out-of-scope finding** about three currently-`verified`
> slow-design entries (`wandering-or-abandonment`, `who-slowness-excludes`,
> `visibility-and-the-unrewarded`) which the adversarial re-pass flagged for latent
> two-sidedness defects (un-argued counter-pole, Q2 de-gotcha). These sit outside this B3 batch
> but warrant your review of the original verified-tier set when you have time.

---

# SLOW-DESIGN EXPANSION (12) — from `slow-design.md`

## 1. maintenance-over-innovation · slow-design
- **Sources:** Russell & Vinsel, "Hail the Maintainers" (*Aeon*, 2016) and *The Innovation Delusion* (Currency, 2020); Jackson, "Rethinking Repair" (in *Media Technologies*, MIT Press, 2014).
- **Tension:** Russell & Vinsel's charge that culture overvalues innovation and undervalues maintenance (the labour that keeps infrastructure, code and objects working) — and Jackson's "broken-world thinking" that locates real value in repair — vs the honest counter that some situations are not maintainable and clinging to upkeep can be its own avoidance; sometimes the new thing is exactly what's needed.
- **Questions:** Does this call for a new thing, or for keeping the existing one alive — and which is harder here? · What would maintaining this well look like, and is that the work being avoided?
- **Status:** P4 ✓ · 3P ✓ — *Pass 4 fixed: publisher is Currency, not Penguin Press (Perplexity had said "Penguin Press"; live lookup overrode it). Entry now reads correctly.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 2. patina-and-the-pristine · slow-design
- **Sources:** Chapman, *Emotionally Durable Design: Objects, Experiences and Empathy* (Earthscan/Routledge, 2005; 2nd ed. 2015); Koren, *Wabi-Sabi: for Artists, Designers, Poets & Philosophers* (Stone Bridge Press, 1994).
- **Tension:** Chapman's *emotional durability* (let things wear, scar and accrue a history so attachment can grow rather than curdle into the itch to replace) and Koren's wabi-sabi (impermanence and the patina of use are where beauty lives) vs pristineness as not vanity — in medical, food, safety or professional contexts visible wear reads as neglect or risk, and not every object is meant to be lived in like a leather chair.
- **Questions:** Is this a thing that should age, or one that should stay new — and who decides? · What does a mark of use signal here: neglect, or care?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 3. the-tyranny-of-convenience · slow-design
- **Sources:** Wu, "The Tyranny of Convenience" (*The New York Times*, 16 February 2018); Borgmann, *Technology and the Character of Contemporary Life* (University of Chicago Press, 1984).
- **Tension:** Wu's charge that convenience has become an unexamined value flattening individuality, with Borgmann's *device paradigm* (devices deliver a commodity while hiding the engaged practice that once produced it, so the practice recedes) vs convenience as also liberation — it frees finite time and attention for what actually matters, and for disabled or overloaded users the "effortful" version is a barrier, not a virtue.
- **Questions:** What does this convenience hand off — and is that something worth keeping in the user's own hands? · Whose effort are you removing, and would they thank you for it or miss it?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 4. personalise-or-narrow · slow-design
- **Sources:** Pariser, *The Filter Bubble: What the Internet Is Hiding from You* (Penguin, 2011); Bruns, *Are Filter Bubbles Real?* (Polity, 2019).
- **Tension:** Pariser's *filter bubble* — personalisation algorithms enclose users in a self-reinforcing loop, thinning the range of views they meet — vs Bruns's finding that the bubble has been "severely overstated", with individual-level narrowing real but societal effects contested, weak or absent depending on platform.
- **Questions:** When you tailor what this user sees, what do they stop encountering — and does that loss matter here? · Is the narrowing you fear a property of the system, or of the person — and which can you design for?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 5. calm-or-attention-grabbing · slow-design
- **Sources:** Weiser & Brown, "The Coming Age of Calm Technology" (1996); Case, *Calm Technology: Principles and Patterns for Non-Intrusive Design* (O'Reilly, 2015).
- **Tension:** Weiser & Brown's *calm technology* (good technology stays at the periphery and comes to the centre only when it genuinely needs to) vs the empirical finding that the answer is rarely "send none" — well-timed, batched or boundary-deferred signals keep most of the value while shedding the harm, and removing notifications entirely can raise anxiety and FoMO.
- **Questions:** Does this signal serve what the user came for, or what you need from them — and would they thank you for it? · If you sent nothing, what would the user lose — and is that loss yours or theirs?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 6. measure-it-or-feel-it · slow-design
- **Sources:** Muller, *The Tyranny of Metrics* (Princeton University Press, 2018); Goodhart's law (orig. C. Goodhart; the popular wording is M. Strathern, 1997).
- **Tension:** Goodhart/Strathern's law ("when a measure becomes a target, it ceases to be a good measure") and Muller's *metric fixation* (substituting standardised measurement for judgement) vs the literature's actual remedy — a slate of measures, qualitative accounts alongside the numbers, and metrics used to *check* gaming rather than drive it; abandoning measurement can be worse than misusing it.
- **Questions:** What is this number standing in for — and what does it stop you seeing? · Is the metric here informing your judgement, or replacing it?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 7. subtract-or-add · slow-design
- **Sources:** Adams, Converse, Hales & Klotz, "People systematically overlook subtractive changes" (*Nature*, 2021); Klotz, *Subtract: The Untapped Science of Less* (Flatiron, 2021).
- **Tension:** The Adams/Klotz *Nature* finding that people systematically default to additive changes and overlook subtractive ones (replicated, robust) vs the counter that subtraction is not automatically virtuous — removing a feature can strip a capability a real user depended on, and "subtraction" can be a way of deflecting work onto someone else.
- **Questions:** Before adding to this, what would removing something do — and did that option even come up? · Who relies on the thing you would take away, and is its removal a gift or a loss to them?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 8. automate-or-by-hand · slow-design
- **Sources:** Crawford, *Shop Class as Soulcraft: An Inquiry into the Value of Work* (Penguin, 2009); Sennett, *The Craftsman* (Yale University Press, 2008).
- **Tension:** Crawford and Sennett's case that manual, skilled work is itself a form of thinking and where competence is built — and the documented pattern of automation/AI assistance eroding skill and tacit knowledge often without the user noticing — vs automation as also freeing/democratising; not every skill is worth keeping in the hand, and romanticising "by hand" can gatekeep or waste a person's finite time.
- **Questions:** Is the work you want to automate pure friction, or where the skill is actually formed — and which is it here? · If the tool does this, what does the person no longer learn — and does that matter for what they're trying to become?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 9. the-feed-or-the-archive · slow-design
- **Sources:** Köhler, David & Blumtritt, "The Slow Media Manifesto" (2010).
- **Tension:** The *Slow Media Manifesto*'s argument for media that are timeless rather than merely timely — made to be kept, re-read and built into over years — vs the feed being exactly right for news, conversation, markets, or anything where currency *is* the value; forcing an archive's permanence onto live information would be precious and unhelpful.
- **Questions:** Is this a stream meant to flow past, or a place things should accumulate and be found again — and which did you choose? · What in here deserves to outlast the moment it appeared, and does the feed let it?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 10. seamful-or-seamless · slow-design
- **Sources:** Chalmers & Galani, "Seamful interweaving: heterogeneity in the theory and design of interactive systems" (DIS, 2004); engaging Weiser's calm/ubiquitous-computing ideal.
- **Tension:** Chalmers & Galani's *seamful* design (deliberately revealing the boundaries, limits and heterogeneity of a system so people can understand and recover from failure) against the seamless, "invisible" Weiserian ideal — vs the counter that most users most of the time do not want to see the plumbing; seamlessness genuinely reduces cognitive load and exposing every seam can overwhelm.
- **Questions:** Which seams are you hiding here — and would showing them help the user understand, or just burden them? · When this behaves unexpectedly, can the user see enough to make sense of it, or only that it "broke"?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 11. finished-or-open-ended · slow-design
- **Sources:** Dix, "Designing for Appropriation" (*Proc. BCS HCI 2007 / People and Computers XXI*); Dourish, "The Appropriation of Interactive Technologies: Some Lessons from Placeless Documents" (*CSCW*, 2003).
- **Tension:** Dix's *designing for appropriation* (leave room, ambiguity and "loose fit" so users can bend a tool to purposes the designer never foresaw) and Dourish's appropriation study vs open-endedness as also abdication — users often want a clear, resolved thing that simply works, and "we left it open for the community" can be a cover for decisions the designer should have made.
- **Questions:** Should this arrive finished, or stay open enough for people to make it their own — and which does it actually need? · Is the openness here an invitation to appropriate, or a decision you've avoided making?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 12. the-new-model-or-the-lasting-thing · slow-design
- **Sources:** Slade, *Made to Break: Technology and Obsolescence in America* (Harvard University Press, 2006); Packard, *The Waste Makers* (1960); Chapman, *Meaningful Stuff* (MIT Press, 2021).
- **Tension:** Slade and Packard's *planned obsolescence* (designing the upgrade cycle to limit useful life and keep replacement flowing) and Chapman's extension to psychological obsolescence (still-working things come to feel like junk) vs the empirical counter — for energy-using goods, efficiency gains can favour replacement, refurbished devices carry real reliability limits, and the obsolescence *narrative* itself can backfire by making people trust working devices less.
- **Questions:** Is the old version genuinely spent, or have you designed it to *feel* spent — and can you tell the difference? · If this lasted twice as long, who would lose and who would gain — and is that trade one you can defend?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

---

# MANUFACTURING LENS EXPANSION (5) — from `manufacturing-lens.md`

## 13. mass-or-batch · manufacturing
- **Sources:** Piore & Sabel, *The Second Industrial Divide: Possibilities for Prosperity* (Basic Books, 1984); Gershenfeld, *Fab: The Coming Revolution on Your Desktop* (Basic Books, 2005); Anderson, *Makers: The New Industrial Revolution* (Crown Business, 2012).
- **Tension:** Piore & Sabel's *flexible specialisation* (skilled, small-batch, regionally clustered production trading some unit-cost for variety and craft retention) and the digital-fabrication writers' extension (Gershenfeld; Anderson) vs mass production as what makes a thing affordable and available at all for a genuinely standard need; small-batch romance can price the very people you meant to serve out of reach.
- **Questions:** Does this want to be one identical thing made at volume, or many close variants made in small runs — and which does the need actually call for? · What does committing to a high-volume tool foreclose if the design or context later varies — and is that a risk worth taking here?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 14. standardise-or-fit-the-place · manufacturing
- **Sources:** Schumacher, *Small Is Beautiful: A Study of Economics as if People Mattered* (Blond & Briggs, 1973); Papanek, *Design for the Real World: Human Ecology and Social Change* (1971).
- **Tension:** Schumacher's *intermediate / appropriate technology* (the right technology fits the scale, skills, materials and economy of the place it serves) and Papanek's real-needs critique vs standardisation and advanced process bringing real gains — interoperability, safety, quality, the steep cost-falls of a global supply chain — while "appropriate technology" can curdle into condescension.
- **Questions:** What can this place and this user actually make, maintain and afford — and does the standard advanced answer fit that, or your idea of progress? · Is choosing the lower-tech "appropriate" option serving the user, or deciding on their behalf what they should settle for?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 15. the-material-and-its-afterlife · manufacturing
- **Sources:** McDonough & Braungart, *Cradle to Cradle: Remaking the Way We Make Things* (North Point Press, 2002); Stahel, "The Product-Life Factor" (1982) and *The Performance Economy* (Palgrave Macmillan, 2010).
- **Tension:** McDonough & Braungart's *cradle-to-cradle* (materials chosen and joined so they can have an afterlife — disassembled, repaired, recycled or safely returned) and Stahel's product-life economics vs sealed/bonded construction being sometimes cheaper, stronger, safer and lighter — design-for-disassembly can add cost, bulk and failure points for a recovery system that, for some products in some places, never actually happens.
- **Questions:** When this breaks or its life ends, can the way it's made let it be repaired or recovered — or does its construction commit it to waste? · Is designing for that afterlife the right call here, or are you adding cost for a recovery system that doesn't exist for this product?
- **Status:** P4 ✓ · 3P ✓ — *Empirics cross-back to slow-design's `the-new-model-or-the-lasting-thing` Consensus pass [NM-Ba, NM-Pr, NM-Ha]; no dedicated Consensus pass for this entry.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 16. prototype-or-product · manufacturing
- **Sources:** Ulrich & Eppinger, *Product Design and Development* (McGraw-Hill, 1st ed. 1995; later editions).
- **Tension:** Ulrich & Eppinger's discipline of moving from a one-off that works for its maker to a thing that can be made repeatedly, holds up across users and conditions, meets safety and reliability standards, and can be produced at cost — vs over-engineering for a robustness the thing will never meet being its own waste; sometimes "good enough to put in front of people" is the disciplined call.
- **Questions:** What separates this prototype from a product — what would fail on the hundredth unit, in someone else's hands, at scale? · Is the gap between "it works here" and "it's a product" being respected, or wished away — and is closing it worth the cost for this thing?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 17. mechanise-or-keep-the-hand · manufacturing
- **Sources:** Gandhi, *Hind Swaraj or Indian Home Rule* (1909); and the Gandhi–Nehru debate on decentralised craft production versus centralised heavy industry in Indian development.
- **Tension:** Gandhi's *Hind Swaraj* critique of centralising machinery that displaces the labour of the many (anti-mass-industrial, not anti-technology — he allowed socially useful machines), with the charkha as decentralised village production — held against the Nehruvian counter that large-scale industry could lift a poor nation out of poverty at speed — vs mechanisation as having lifted enormous numbers out of grinding, precarious manual labour; insisting on the hand can romanticise drudgery or trap artisans in poverty a machine would relieve.
- **Questions:** What would mechanising this give, and to whom — and who does the machine displace, made better off or merely done without? · Is keeping the handwork honouring a livelihood and a skill, or romanticising drudgery the maker would gladly be freed from?
- **Status:** P4 ✓ · 3P ✓ — *Distinct from slow-design's `automate-or-by-hand` (individual designer's craft-skill); this is the political economy of decentralised vs centralised production.*
- **Outstanding:** Confirm Gandhi's nuanced position (anti-mass-industrial, not anti-technology) against *Hind Swaraj*'s own text at sign-off — flagged at framing-confidence.  **Sign-off ☐**

---

# MOVING-IMAGE EXPANSION (5) — from `moving-image.md`

## 18. the-long-take-and-the-cut · moving-image
- **Sources:** Bazin, *What Is Cinema?* (essays incl. "The Ontology of the Photographic Image" and "The Evolution of the Language of Cinema"; trans. Hugh Gray, University of California Press, 1967).
- **Tension:** Bazin's cinema of realism — the long take, deep focus and minimal cutting that keep the integrity and ambiguity of a real moment intact and let the viewer's eye choose where to look — vs duration not being automatically truth; a held shot can be self-indulgent, withhold emphasis the viewer needs, or mistake slowness for depth, and editing is how cinema directs attention and builds rhythm.
- **Questions:** What does holding this shot unbroken preserve that a cut would destroy — and is that worth the viewer's patience here? · What would cutting clarify or intensify — and is the long take serving the moment, or your idea of seriousness?
- **Status:** P4 ✓ · 3P ✓ — *Pairs with and counters the original `meaning-in-the-cut`.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 19. sound-and-the-image · moving-image
- **Sources:** Chion, *Audio-Vision: Sound on Screen* (ed./trans. Claudia Gorbman, Columbia University Press, 1994; orig. *L'Audio-vision*, 1990).
- **Tension:** Chion's *synchresis* and "added value" (sound silently tells us how to read a picture; the mind welds sound to image so completely the sound seems to come from it) — sound as co-author of meaning, often most powerful when unnoticed — vs the image carrying the work alone in silent cinema, the muted scroll, the photograph; reliance on score to tell the viewer how to feel can be a crutch covering for images that have not earned the emotion.
- **Questions:** What is the sound doing to this image — adding meaning the picture cannot make alone, or telling the viewer what to feel because the image doesn't? · If you cut the sound entirely, what would the image still say — and what would it lose?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 20. who-the-camera-looks-for · moving-image
- **Sources:** Mulvey, "Visual Pleasure and Narrative Cinema," *Screen* 16, no. 3 (1975); and the substantial later literature complicating it (including Mulvey's own reconsiderations).
- **Tension:** Mulvey's *male gaze* (classical cinema constructs a masculine spectator-position for whom women appear as objects of looking, reframing framing itself as a question of power) vs the thesis having been complicated and contested — including by Mulvey herself — over whether the gaze is single or monolithic, how female and other spectators actually look, and whether the viewer is as passively positioned as the theory implies.
- **Questions:** Whom does this shot position as the one looking, and who is placed as the looked-at — and is that arrangement one you chose, or one you inherited? · If the viewer you're imagining is not the only kind of viewer, how else might this image be seen — and does that change it?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 21. documentary-truth-and-construction · moving-image
- **Sources:** Nichols, *Representing Reality: Issues and Concepts in Documentary* (Indiana University Press, 1991).
- **Tension:** Nichols's argument that every documentary selects, frames, sequences and narrates — even the most observational "fly on the wall" film chooses where to point the camera and what to cut — so documentary is always a *construction about* reality, not a transparent window onto it — vs acknowledging construction not collapsing the distinction between documentary and fiction; over-stressing constructedness can slide into a corrosive relativism that excuses manipulation or fabrication.
- **Questions:** What does this film's claim to be "real" actually rest on — and where is the line between honest framing and misleading the viewer? · Given that you must select and shape, what would you *not* do to the material — and why does that limit matter?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 22. continuity-or-rupture · moving-image
- **Sources:** Bordwell, Staiger & Thompson, *The Classical Hollywood Cinema* (1985) and Bordwell & Thompson, *Film Art: An Introduction*; the rupture counter-tradition in Brechtian distanciation and the films of Jean-Luc Godard.
- **Tension:** Classical continuity editing (match-on-action, eyeline match, 180-degree rule) working to make cuts *invisible* so the viewer is carried smoothly through the narrative — vs the counter-tradition that deliberately *ruptures* continuity (Godard's jump cuts, Brechtian distanciation) to break the spell and ask viewers to think rather than only feel; rupture can also simply read as a mistake.
- **Questions:** Is this edit meant to carry the viewer in unnoticed, or to break the surface and make them aware — and which does this piece actually want? · When a cut jars, is that a deliberate rupture doing work, or a stumble the viewer will read as a mistake?
- **Status:** P4 ✓ · 3P ✓ — *Distinct from slow-design's `seamful-or-seamless` (system legibility, not narrative immersion).*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

---

# MONEY-CAREER LENS EXPANSION (4) — from `money-career-lens.md`

## 23. passion-or-paycheck · money-career
- **Sources:** Tokumitsu, "In the Name of Love" (*Jacobin*, 2014) and *Do What You Love: And Other Lies About Success and Happiness* (2015); Kim, Campbell, Shepherd & Kay, "Understanding contemporary forms of exploitation: Attributions of passion serve to legitimize the poor treatment of workers" (*Journal of Personality and Social Psychology*, 2020).
- **Tension:** Tokumitsu's critique that "do what you love" can legitimise low pay, unpaid overtime and precarity (Kim et al. show experimentally that people *do* judge exploiting "passionate" workers as more acceptable; the passion schema rewards those already privileged enough to chase it) vs work passion's real benefits — lower burnout, stronger commitment, better wellbeing, and the "Passionate Pygmalion" effect by which passionate workers are given more opportunity.
- **Questions:** What is your passion being asked to pay for here — the meaning of the work, or a discount on what you're owed for it? · If this work paid properly and demanded less devotion, would it be less worth doing — and if "you love it" is the reason to accept less, whose interest does that serve?
- **Status:** P4 ✓ · C ✓ · 3P ✓ — *Pass 2 flagged Q2 tail "...whose interest does that serve?" as rhetorical / one-acceptable-answer (de-gotcha concern); Pass 3 cleared the same entry as balanced. Documented Pass 2/Pass 3 split, routed to you.*
- **Outstanding:** **Pass-2/Pass-3 split — Prayas adjudicates Q2 tail.** A one-line de-gotcha rewrite is available if you agree with Pass 2 (e.g. soften "whose interest does that serve?" to "what does that arrangement actually serve?" or similar). The lens's standing anti-money-tilt watch applies here — both poles already weighted in the entry.  **Sign-off ☐**

## 24. specialist-or-generalist · money-career
- **Sources:** Ericsson, Krampe & Tesch-Römer, "The role of deliberate practice in the acquisition of expert performance" (*Psychological Review*, 1993); Güllich, Macnamara & Hambrick, "What Makes a Champion? Early Multidisciplinary Practice, Not Early Specialization, Predicts World-Class Performance" (*Perspectives on Psychological Science*, 2021); Teodoridis, Bikard & Vakili, "Creativity at the Knowledge Frontier: The Impact of Specialization in Fast- and Slow-paced Domains" (*Administrative Science Quarterly*, 2018); the popular synthesis: Epstein, *Range: Why Generalists Triumph in a Specialized World* (2019).
- **Tension:** Ericsson's deliberate-practice account (reaching the top of a field demands years of focused, effortful practice) and the specialist premium vs Güllich's finding that world-class athletes and Nobel laureates had *more* multidisciplinary experience and specialised *later* than their merely national-level peers; Teodoridis showing generalists outperform in slower-paced fields while specialists win at the fast frontier; the strong deliberate-practice claim itself empirically overstated.
- **Questions:** Does this field reward deep narrow mastery, or the range to connect distant things — and which does the work you want actually call for? · Is "specialise" a considered fit for where you're headed, or a fear of looking unfocused — and is "stay broad" curiosity, or avoidance of commitment?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 25. freelance-or-employed · money-career
- **Sources:** Standing, *The Precariat: The New Dangerous Class* (Bloomsbury, 2011); van der Zwan, Hessels & Burger, "Happy free willies? Investigating the relationship between freelancing and subjective well-being" (*Small Business Economics*, 2019); Berger, Frey, Levin & Danda, "Uber happy? Work and well-being in the 'Gig Economy'" (*Economic Policy*, 2019); Shevchuk, Strebkov & Davis, "The Autonomy Paradox: How Night Work Undermines Subjective Well-Being of Internet-Based Freelancers" (*ILR Review*, 2019).
- **Tension:** The autonomy/job-satisfaction gains of freelancing (van der Zwan et al.; Berger et al.; the self-employed report higher job satisfaction despite lower pay) vs the insecurity costs — gig workers report worse mental health and life satisfaction mediated by loneliness and financial precarity; Shevchuk's *autonomy paradox* (discretionary flexibility undermines wellbeing); a striking evaluative-vs-emotional split, with a *mix* of salaried and independent work often most satisfying.
- **Questions:** What are you actually trading here — security for autonomy, a steady floor for a higher ceiling, calm for meaning — and is that a trade you want? · Are you choosing freelance for the freedom, or leaving employment out of a restlessness a different job might settle?
- **Status:** P4 ✓ · C ✓ · 3P ✓ — *Pass 4 fixed: third author is Burger, not Rietveld (live-confirmed via Crossref / DOI 10.1007/s11187-019-00246-6 — same failure mode as the prior Moroni & Cavalieri catch). Entry now reads correctly.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 26. the-portfolio-and-the-personal-brand · money-career
- **Sources:** Hearn, "'Meat, Mask, Burden': Probing the contours of the branded self" (*Journal of Consumer Culture*, 2008); Marwick, *Status Update: Celebrity, Publicity, and Branding in the Social Media Age* (Yale University Press, 2013).
- **Tension:** Hearn and Marwick's critique that self-branding is unpaid labour that can blur the line between the person and the product, reward performance over substance, and pull the maker toward whatever the audience rewards rather than the work they care about — vs a portfolio and reachable professional presence being genuine, fair tools for getting work, not vanity; refusing visibility entirely can quietly cost a career.
- **Questions:** What is the brand for here — letting real work reach the people who need it, or a performance that's started to shape the work itself? · Is the self you present a clarification of who you are, or a flattening of it into what the audience rewards?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

---

# PRODUCT-DESIGN EXPANSION (4) — from `product-design.md`

## 27. good-design-or-styling · product-design
- **Sources:** Rams, "Ten Principles of Good Design" (Braun, 1970s–80s; "as little design as possible" / "less, but better"); Loewy, *Never Leave Well Enough Alone* (1951), articulating the MAYA — "Most Advanced Yet Acceptable" — principle.
- **Tension:** Rams's *Ten Principles of Good Design* (good design is unobtrusive, honest, long-lasting and as little design as possible — "less, but better") vs Loewy's *MAYA* (products must be styled to be desirable and sellable, advanced enough to excite but familiar enough to be accepted; styling is not a betrayal of function but how a thing reaches people at all).
- **Questions:** Is the form you're giving this serving the object and its user honestly, or styling it to sell — and are those actually opposed here? · If you stripped it to "as little design as possible", what would be lost — desirability, delight, legibility — and does that loss matter for this product?
- **Status:** P4 ✓ · 3P ✓ — *Overlaps slow-design's `restraint-is-not-neutral` on minimalism, but here the axis is product good-design-vs-market-styling, not aesthetic neutrality.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 28. the-average-and-the-edge · product-design
- **Sources:** Daniels, "The 'Average Man'?" (USAF, 1952); Rose, *The End of Average* (2016); Dreyfuss, *Designing for People* (1955), and the "Joe and Josephine" anthropometric figures.
- **Tension:** The USAF "average man" finding — almost no actual pilot fell within the average across ten dimensions (Daniels, 1952) — and Rose's *End of Average* generalising the point (the "average human" is a statistical fiction that fits almost no one) and Dreyfuss's anthropometric tradition vs designers cannot make infinite variants — some standardisation is unavoidable and even good, and full bespoke personalisation carries real cost, complexity and waste.
- **Questions:** Who does the "average user" in your head actually leave out — and would a range or an adjustable design fit real people better here? · Where is standardising a sensible necessity, and where has it quietly become a one-size that misfits most?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 29. the-object-and-its-meaning · product-design
- **Sources:** Krippendorff & Butter, "Product Semantics: Exploring the Symbolic Qualities of Form," *Innovation* 3, no. 2 (1984); Krippendorff, *The Semantic Turn: A New Foundation for Design* (2006).
- **Tension:** Krippendorff & Butter's *product semantics* (form *communicates* — it tells users what a thing is, how to use it, what it means and whom it is for; a designer is always shaping meaning whether they attend to it or not) vs meaning being over-read and over-designed — loading an object with semantic intention can produce gimmickry, cultural misreadings, or forms that signal more than they deliver.
- **Questions:** Beyond what it does, what is this object communicating — and is that meaning one you chose, or one you haven't noticed? · Where would attending to meaning make this clearer or more usable, and where would it tip into a form that says more than the thing delivers?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 30. emotion-or-the-functional · product-design
- **Sources:** Norman, *Emotional Design: Why We Love (or Hate) Everyday Things* (Basic Books, 2004); the aesthetic-usability effect — Kurosu & Kashimura (1995); Tractinsky, "What is beautiful is usable" (2000).
- **Tension:** Norman's *Emotional Design* and the aesthetic-usability effect (attractive things "really do work better" — perceived beauty raises perceived usability; positive affect changes how people perceive, tolerate and engage) vs the meta-analytic counter that the effect is small and heterogeneous on actual performance, sometimes reversed ("what is usable is beautiful"), wanes with prolonged use, and attractive interfaces can even mask poor usability.
- **Questions:** What is beauty actually doing for this product — improving the experience and the using of it, or buying goodwill that covers for poor function? · If the appeal wore off after a week of real use, what would be left — and is that what you're designing for?
- **Status:** P4 ✓ · C ✓ · 3P ✓ — *Distinct from the IxD experience-beyond-usability entry; this is the object's beauty and the aesthetic-usability halo specifically.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

---

# SPACE-DESIGN EXPANSION (4) — from `space-design.md`

## 31. form-follows-function-or-more · space-design
- **Sources:** Sullivan, "The Tall Office Building Artistically Considered" (1896, "form ever follows function"); Venturi, *Complexity and Contradiction in Architecture* (Museum of Modern Art, 1966, "less is a bore").
- **Tension:** Sullivan's maxim that "form ever follows function" — modernism's article of faith, a building's shape arising honestly from its purpose and structure — vs Venturi's pluralism ("less is a bore"; architecture legitimately carries meaning, symbolism, history and contradiction beyond mere function); functionalism risks barren uniformity, Venturi's pluralism risks arbitrary or self-indulgent form.
- **Questions:** How much of this form genuinely follows from its function, and how much is meaning or expression you're adding — and can you own that distinction? · If you stripped everything that doesn't serve the function, what would be lost — and was it doing real work, or just decoration?
- **Status:** P4 ✓ · 3P ✓ — *Venturi also tagged in communication-design's less-is-more entry; there the axis is graphic minimalism, here architectural form-function — distinct.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 32. the-spirit-of-the-place · space-design
- **Sources:** Norberg-Schulz, *Genius Loci: Towards a Phenomenology of Architecture* (Rizzoli, 1980); Relph, *Place and Placelessness* (Pion, 1976).
- **Tension:** Norberg-Schulz's *Genius Loci* (architecture's deepest task is to gather and express the spirit of a place — landscape, light, materials, history, character — so that a building helps people dwell and belong) and Relph's *placelessness* (the loss when this fails) vs the international modernist project's deliberate freedom from parochial constraint; generic, flexible, repeatable forms can be efficient, affordable, adaptable and quietly democratic, and "respecting the place" can shade into nostalgia or pastiche.
- **Questions:** What does this specific place give the design — and would responding to it deepen the work, or is a more neutral, flexible form what the users actually need here? · If this could be built anywhere unchanged, is that a failure of rootedness, or a legitimate kind of usefulness for this brief?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 33. the-building-after-the-architect · space-design
- **Sources:** Brand, *How Buildings Learn: What Happens After They're Built* (Viking, 1994).
- **Tension:** Brand's argument that buildings are not finished objects but slow processes, continually torn into and reshaped by their occupants, with different "shearing layers" changing at different rates — the best buildings adapt well, designed to be modified, not frozen — vs some buildings genuinely benefiting from a strong, coherent, controlled vision (civic and sacred architecture), and "design for change" becoming an excuse for formless flexibility no one loves enough to keep.
- **Questions:** Is this a building to be finished and held to a vision, or one set up to be changed by the people who live in it — and which does it actually need? · What will the occupants want to alter first, and does your design make that easy or fight it?
- **Status:** P4 ✓ · 3P ✓ — *Relates to slow-design's `finished-or-open-ended` but is specific to buildings adapting over time, not the artefact's openness to user appropriation.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 34. the-building-or-the-life-between · space-design
- **Sources:** Gehl, *Life Between Buildings: Using Public Space* (orig. Danish 1971; English trans. 1987).
- **Tension:** Gehl's argument that what matters most in public space is the *life* between buildings — the walking, sitting, lingering, meeting — and that modernist planning, by designing impressive forms and ignoring human activity at eye level and walking pace, produced spaces that work in the plan and photograph but are dead to be in — vs form and the building-as-object not being merely vanity; landmark buildings give places identity, orientation and pride, and great public life often gathers around strong architectural form.
- **Questions:** Are you designing a form to be looked at or a space to be lived in — and what will people at walking pace actually do here? · If the building photographed beautifully but no one lingered between, would the design have succeeded — and by whose measure?
- **Status:** P4 ✓ · 3P ✓ — *Relates to `the-eye-vs-the-whole-body` but is about public life and activity, not multisensory bodily experience.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

---

# TRANSDISCIPLINARY-DESIGN EXPANSION (4) — from `transdisciplinary-design.md`

## 35. design-thinking-and-its-critics · transdisciplinary-design
- **Sources:** Brown, *Change by Design* (2009) and "Design Thinking" (*Harvard Business Review*, 2008); the critiques — Iskander, "Design Thinking Is Fundamentally Conservative and Preserves the Status Quo" (*HBR*, 2018); Kimbell, "Rethinking Design Thinking" (*Design and Culture*, 2011).
- **Tension:** Brown's popularisation of design thinking (a transferable, human-centred process — empathise, define, ideate, prototype, test — that anyone in any field could use to innovate) vs Iskander's charge that design thinking is "fundamentally conservative", smoothing problems into a tidy procedure that preserves the status quo, and Kimbell's argument that the popular accounts oversimplify what design actually is, reducing situated practice to a generic cognitive recipe.
- **Questions:** Is the process you're running doing real work on this problem, or performing the steps of a method — and how would you tell the difference? · What does the tidy sequence leave out here — whose problem it is, what can't be prototyped in an afternoon, what the method's neatness hides?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 36. who-gets-to-design · transdisciplinary-design
- **Sources:** Ehn, *Work-Oriented Design of Computer Artifacts* (1988); Sanders & Stappers, "Co-creation and the new landscapes of design," *CoDesign* 4, no. 1 (2008); Arnstein, "A Ladder of Citizen Participation," *JAIP* (1969).
- **Tension:** The participatory-design tradition (Ehn; Sanders & Stappers) — those affected should be active participants, with real evidence co-designed concepts score higher in user benefit and novelty — vs participation's limits: co-designed concepts can score *lower* in feasibility, *partial* involvement (users frame the problem, professionals develop the solution) can outperform full co-design, and participation easily becomes tokenistic (Arnstein's lower rungs) when power is not genuinely shared.
- **Questions:** Who genuinely needs a hand in this decision, and at what stage — framing the problem, judging options, or making the final call? · Is the participation you're planning sharing real power, or staging consultation while the decisions stay where they were?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 37. thinking-in-systems-or-the-thing · transdisciplinary-design
- **Sources:** Meadows, *Thinking in Systems: A Primer* (Chelsea Green, 2008).
- **Tension:** Meadows's argument that durable change comes from understanding the whole — feedback loops and leverage points — rather than tinkering with a part, and that intervening at the wrong place produces effort the system quietly absorbs — vs systems thinking's own failure mode: zoomed out far enough, everything connects to everything, and the call to "address the whole system" can become a route to paralysis, grandiosity, or endless mapping that never ships an intervention.
- **Questions:** Does this problem actually live in the system, or in the thing in front of you — and what's the smallest real intervention if it's the system? · Is "we have to think systemically" opening up the right scope here, or becoming a reason not to make the concrete thing that would move it?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 38. crossing-disciplines-or-going-deep · transdisciplinary-design
- **Sources:** Gibbons, Limoges, Nowotny, Schwartzman, Scott & Trow, *The New Production of Knowledge* (Sage, 1994, Mode 1 / Mode 2); Nicolescu, *Manifesto of Transdisciplinarity* (SUNY Press, 2002).
- **Tension:** Gibbons et al.'s "Mode 2" knowledge (produced around real-world problems, in context, across disciplinary boundaries rather than within "Mode 1" academic silos) and Nicolescu's integrative ideal vs depth being real and not interchangeable with breadth — integration without genuine command of the fields being integrated can produce confident superficiality, borrowing the vocabulary of many disciplines and the rigour of none.
- **Questions:** Does this problem genuinely require crossing disciplines, or is "transdisciplinary" a way around the harder work of depth in one? · If it does cross fields, where is the real command of each coming from — yours, or collaborators' — so the integration isn't borrowing a rigour it doesn't have?
- **Status:** P4 ✓ · 3P ✓ — *Relates to money-career's `specialist-or-generalist` but is about knowledge production across fields, not career structure.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

---

# ENTREPRENEURSHIP LENS EXPANSION (3) — from `entrepreneurship-lens.md`

## 39. specialist-or-full-service · entrepreneurship
- **Sources:** Baker, *The Business of Expertise: How Entrepreneurial Experts Convert Insight to Impact + Wealth* (2017).
- **Tension:** Baker's argument that positioning as a narrow specialist concentrates pattern-recognition, builds authority, and commands premium fees (the focused expert is rare while a generalist is a substitute for many others) vs the conditional counter — generalists win where networks are rich in brokerage opportunities, fields change slowly, or clients hold strong bargaining power; the worst place to sit is "stuck in the middle".
- **Questions:** What could this practice genuinely own as a specialist — and would narrowing concentrate your authority, or just shrink a market that rewards range? · Where is "full-service" real resilience and flexibility, and where is it a refusal to decide what you're for?
- **Status:** P4 ✓ · C ✓ · 3P ✓ — *Relates to money-career's `specialist-or-generalist` (individual skills); here it is studio/practice positioning.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 40. own-product-or-client-services · entrepreneurship
- **Sources:** Fried & Hansson, *Rework* (Crown Business, 2010); and the documented services-to-product / "productised services" debate in creative practice.
- **Tension:** Fried & Hansson's product path (start something you own, stay lean, let it pay for itself — escape the time-for-money ceiling of services, build equity rather than only income) vs the studio's daily reality — client services fund the lights now and carry low risk, while a product demands sustained investment, pulls focus from paying work, and most fail; "productising" can quietly hollow out the bespoke craft that made the studio good.
- **Questions:** Is building your own product a move toward owning what you make, or an escape from client work you haven't yet mastered — and which is it here? · Can the services practice fund and survive the product's long, uncertain build — or would the bet starve the work that pays?
- **Status:** P4 ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 41. bootstrap-or-raise · entrepreneurship
- **Sources:** Fried & Hansson, *Rework* (Crown Business, 2010, the bootstrapping case); Ries, *The Lean Startup* (Crown Business, 2011, the build-measure-learn / scaling case).
- **Tension:** Ries's *Lean Startup* logic and the venture model (for a business with real scale potential, capital and investor expertise accelerate growth and reach a size self-funding never could — venture-backed firms reach far larger scale and lower early-stage failure) vs Fried & Hansson's bootstrapping (forces financial discipline, keeps founder in control, avoids the growth-at-all-costs pressure); bootstrappers show comparable outcomes and *less* failure variance, and venture-backed firms often show worse profitability and ceded control.
- **Questions:** What does this venture need capital *for* — a real scale opportunity with a closing window, or a substitute for revenue it hasn't yet learned to earn? · What would raising cost in control, discipline and the kind of company this becomes — and is that price worth the speed?
- **Status:** P4 ✓ · C ✓ · 3P ✓ — *Pass 3 explicitly cleared the anti-venture-tilt watch: the raise pole carries genuine empirical weight and a winning case; both poles are weighted; no verdict.*
- **Outstanding:** none — the ⚠ sign-off watch is addressed (the project's anti-venture orientation did NOT tilt this). **Ready.**  **Sign-off ☐**

---

# SUSTAINABLE-FASHION EXPANSION (3) — from `sustainable-fashion.md`

## 42. the-natural-or-the-synthetic · sustainable-fashion
- **Sources:** Fletcher & Grose, *Fashion & Sustainability: Design for Change* (Laurence King, 2012); and textile lifecycle-assessment literature on fibre impacts (no single superior fibre).
- **Tension:** The LCA finding that there is no single "sustainable" fibre — cotton carries heavy water/pesticide burdens, polyester sheds microplastics (~one-third of primary marine microplastics), natural and semi-synthetic microfibres also pollute, and which fibre "wins" flips by impact category — with use, longevity and volume often outweighing the fibre swap — vs fibre choice not being nothing; a genuinely lower-impact material in the relevant category is a real, immediately actionable improvement, and "it's complicated" is its own evasion.
- **Questions:** For this garment, which impact matters most — water, climate, microplastics, biodegradability — and does your fibre choice actually reduce *that*, or just feel natural? · Is the fibre swap the real leverage here, or is it use, longevity and how much you make — and are you choosing the material to avoid the harder question?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 43. recycling-or-making-less · sustainable-fashion
- **Sources:** Ellen MacArthur Foundation, *A New Textiles Economy: Redesigning Fashion's Future* (2017); and textile-LCA literature on the limits of recycling versus reduction and reuse.
- **Tension:** The textile-LCA finding that textile-to-textile recycling is marginal (blends defeat clean separation; mechanical recycling downcycles; only a small fraction is recycled at all; scaling textile-to-textile to a tenth of EU consumption would cut climate impact <1%) and the hierarchy that *reduce* and *extend life* beat *reuse* beat *recycle* — vs recycling not being worthless (diverts waste from landfill, displaces some virgin material, recycled fibres lower-impact than virgin); dismissing it entirely is as lazy as treating it as the whole answer.
- **Questions:** Is "recyclable" doing real work for this garment, or supplying permission to keep producing and discarding? · Between making less, making it last, and making it recyclable, where does the real leverage sit here — and which are you actually choosing?
- **Status:** P4 ✓ · C ✓ · 3P ✓ — *Relates to manufacturing's `the-material-and-its-afterlife` and slow-design's `the-new-model-or-the-lasting-thing`, but is textile-recycling-specific.*
- **Outstanding:** none. **Ready.**  **Sign-off ☐**

## 44. the-second-hand-and-its-afterlife · sustainable-fashion
- **Sources:** Brooks, *Clothing Poverty: The Hidden World of Fast Fashion and Second-Hand Clothes* (Zed Books, 2015); and the second-hand-trade and reuse literature (livelihoods and affordability vs waste-export and rebound).
- **Tension:** The reuse case (second-hand is the primary, affordable source of clothes for many of the world's poorest — ~24bn items/yr — and sustains real livelihoods in transport, cleaning, repair, restyling across the Global South) vs Brooks's *Clothing Poverty* showing the same trade exports waste and undermines local textile industries — "waste colonialism", documented at Kantamanto/Accra, with ~40% of the decline in African apparel/textile production attributable to used-clothing imports; and the rebound finding that second-hand buyers buy *more* new clothing too (r=0.58), suggesting resale may supplement rather than displace fast fashion.
- **Questions:** What actually happens to this garment after it's donated — does the gesture extend a real life, or export a disposal problem with a clear conscience attached? · Does buying or designing for second-hand here genuinely reduce consumption, or quietly license more — and for whom does the trade work?
- **Status:** P4 ✓ · C ✓ · 3P ✓
- **Outstanding:** **Cosmetic — framing_confidence cites "Brooks 2025" (Sustainability journal article [SH-Br]) while sources cites *Clothing Poverty* (2015). Both are real Brooks works.** Clarify the date reference at sign-off to avoid a date-mismatch read (no factual error, two genuine sources by the same author).  **Sign-off ☐**

---

## Summary for sign-off

- **Ready now (41)** — clean across the four-pass gate; no outstanding item beyond your judgement.
- **One outstanding item or note each (3):**
  - `passion-or-paycheck` — Pass-2/Pass-3 split on Q2 tail; you adjudicate (one-line de-gotcha rewrite available).
  - `the-second-hand-and-its-afterlife` — cosmetic Brooks 2015/2025 date clarification.
  - `mechanise-or-keep-the-hand` — confirm Gandhi's nuanced position (anti-mass-industrial, not anti-technology) against *Hind Swaraj*'s own text.
- **Pass-4 corrections already applied (note only, no action):**
  - `maintenance-over-innovation` — publisher Currency, not Penguin Press (Perplexity overridden by live lookup).
  - `freelance-or-employed` — third author Burger, not Rietveld (live Crossref / DOI confirmation; same failure mode as the prior Moroni & Cavalieri catch).
- **The honest floor (architecture.md §3a):** the four passes are a filter; the real floor is the citation layer (now Pass-4 verified) **plus your sign-off and a spot-check**. Pass 4 honestly disclosed **11 cited works it did not independently re-look-up** this run — a confirmatory spot-check at sign-off could close them. **Standing note (out of scope of B3):** Pass 2 and Pass 3 flagged three currently-`verified` slow-design entries — `wandering-or-abandonment`, `who-slowness-excludes`, `visibility-and-the-unrewarded` — for latent two-sidedness defects worth your review of the original verified-tier set when you have time. These notes are advisory; your reading governs.
