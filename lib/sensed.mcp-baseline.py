"""Deterministic arithmetic for the three split-ratio readings.

Canon: https://splitdomaincognition.org/split-ratio/
This module is the §145 compute layer. No LLM may participate in any function
here. Every reading is reconstructible by hand from the segments and the rules
described in the docstrings below.

Schema: Split Record v1.0 (see ../schemas/split-record-v1.0.json).
"""

from __future__ import annotations

from typing import Iterable

STRICT_RULE = (
    "A segment is a conflation if: (a) sdc_stage is 'judgement' and "
    "judgement_held_by is 'ai' or 'shared'; OR (b) sdc_stage is 'narration' "
    "and judgement_held_by is 'ai'; OR (c) sdc_stage is 'mixed'."
)

GENEROUS_RULE = (
    "A segment is a conflation only if sdc_stage is 'judgement' AND "
    "judgement_held_by is 'ai'. AI phrasing over a human-held judgement is "
    "counted as held."
)

BALANCED_RULE = (
    "Same conflation rule as strict, but each segment contributes its 'weight' "
    "(default 1.0) so a thesis or conclusion conflation moves the needle more "
    "than an aside."
)

CLAMP_RULE = (
    "Ratios use 1-9 only. N = clamp(round(10 * share_held), 1, 9); M = 10 - N. "
    "Canon §149 excludes 10:0 and 0:10 endpoints by design."
)


def _is_strict_conflation(seg: dict) -> bool:
    stage = seg.get("sdc_stage")
    held = seg.get("judgement_held_by")
    if stage == "judgement" and held in ("ai", "shared"):
        return True
    if stage == "narration" and held == "ai":
        return True
    if stage == "mixed":
        return True
    return False


def _is_generous_conflation(seg: dict) -> bool:
    return seg.get("sdc_stage") == "judgement" and seg.get("judgement_held_by") == "ai"


def _segment_weight(seg: dict) -> float:
    w = seg.get("weight", 1.0)
    try:
        w = float(w)
    except (TypeError, ValueError):
        w = 1.0
    return w if w > 0 else 1.0


def _ratio_from_share(share_held: float) -> str:
    n = round(10 * share_held)
    if n < 1:
        n = 1
    if n > 9:
        n = 9
    m = 10 - n
    return f"{n}:{m}"


def _why_strict(total: int, conflated: int) -> str:
    if conflated == 0:
        return "no segments meet the strict conflation rule (judgement→ai/shared, narration→ai, or mixed)."
    return (
        f"{conflated} of {total} segments meet the strict conflation rule "
        "(judgement→ai/shared, narration→ai, or mixed)."
    )


def _why_generous(total: int, conflated: int) -> str:
    if conflated == 0:
        return "no segments where AI actually held the judgement; AI phrasing over a human-held call counts as held."
    return (
        f"only {conflated} of {total} segments are judgement-stage with "
        "judgement_held_by='ai'; AI phrasing elsewhere is forgiven."
    )


def _why_balanced(total: int, weighted_conflation: float, total_weight: float) -> str:
    if weighted_conflation == 0:
        return "no weighted conflations; balanced reading matches strict on this record."
    return (
        f"weighted conflations {weighted_conflation:.2f} of total weight "
        f"{total_weight:.2f} across {total} segments — load-bearing conflations "
        "weigh more than asides."
    )


def read_split_record(record: dict) -> dict:
    """Compute the three readings from a (validated) Split Record.

    Each reading returns {"ratio": "N:M", "why": "one line"} where N+M==10 and
    both are clamped to [1,9] per canon §149.
    """
    inner = record.get("split_record") or record
    segments: Iterable[dict] = inner.get("segments", [])
    segs = list(segments)
    total = len(segs)
    if total == 0:
        raise ValueError("Split Record has no segments; cannot compute readings.")

    strict_conflated = sum(1 for s in segs if _is_strict_conflation(s))
    strict_share = (total - strict_conflated) / total

    generous_conflated = sum(1 for s in segs if _is_generous_conflation(s))
    generous_share = (total - generous_conflated) / total

    total_weight = sum(_segment_weight(s) for s in segs)
    balanced_conflation_weight = sum(
        _segment_weight(s) for s in segs if _is_strict_conflation(s)
    )
    balanced_share = (
        (total_weight - balanced_conflation_weight) / total_weight
        if total_weight > 0
        else 1.0
    )

    return {
        "strict": {
            "ratio": _ratio_from_share(strict_share),
            "why": _why_strict(total, strict_conflated),
        },
        "balanced": {
            "ratio": _ratio_from_share(balanced_share),
            "why": _why_balanced(total, balanced_conflation_weight, total_weight),
        },
        "generous": {
            "ratio": _ratio_from_share(generous_share),
            "why": _why_generous(total, generous_conflated),
        },
    }


def _segment_id(seg: dict, index: int):
    """Stable identifier for a segment: its declared id, else its index."""
    sid = seg.get("id")
    return sid if sid is not None else index


def read_sensed(record: dict) -> dict:
    """Sensed-register reading of an artefact (canon 'Two registers', §121-187).

    Same deterministic arithmetic as read_split_record, but additionally returns,
    per reading, the ids of the segments that count as conflations — the points
    where description and judgement blur. This is the analyse capability: it reads
    a text artefact (an AI-produced text the reader did not co-build) and LOCATES
    where the discipline slips. It does not judge whether a located conflation is
    a mistake — that is the human's call. The tool locates; the human judges.

    Per canon §153 this output is labelled 'sensed_reading' and is never "the
    split ratio" (that phrase is reserved for a maker's self-declaration). Per
    §155 it is per-instance and never aggregated: one record, one reading, no
    history. The arithmetic is identical to read_split_record, so any ratio here
    is reconstructible by hand from the same rules.
    """
    inner = record.get("split_record") or record
    segs = list(inner.get("segments", []))
    total = len(segs)
    if total == 0:
        raise ValueError("Split Record has no segments; cannot compute a sensed reading.")

    readings = read_split_record(record)

    strict_ids = [_segment_id(s, i) for i, s in enumerate(segs) if _is_strict_conflation(s)]
    generous_ids = [_segment_id(s, i) for i, s in enumerate(segs) if _is_generous_conflation(s)]
    # Balanced uses the strict conflation SET; weight changes the ratio, not which
    # segments conflate — so the located points are the same as strict's.
    balanced_ids = list(strict_ids)

    return {
        "register": "sensed",
        "label": "sensed_reading",
        "strict": {**readings["strict"], "conflation_segment_ids": strict_ids},
        "balanced": {**readings["balanced"], "conflation_segment_ids": balanced_ids},
        "generous": {**readings["generous"], "conflation_segment_ids": generous_ids},
        "note": (
            "Sensed reading — never 'the split ratio' (canon §153, reserved for a "
            "maker's self-declaration). Per-instance; never aggregated (§155). The "
            "conflation_segment_ids LOCATE where description and judgement blur; "
            "whether each is a smuggled verdict is the human's judgement, not the "
            "tool's."
        ),
    }


def describe_arithmetic() -> dict:
    return {
        "strict": STRICT_RULE,
        "balanced": BALANCED_RULE,
        "generous": GENEROUS_RULE,
        "clamp_rule": CLAMP_RULE,
    }
