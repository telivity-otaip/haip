---
name: haip-research
description: Research hotel PMS domain knowledge from authoritative sources. Use whenever the KB has gaps, a domain question comes up that can't be answered from existing knowledge, or when competitive intelligence needs updating. Trigger on "research this", "what does the industry say about", "find out how hotels handle", or any domain question not covered in HAIP_KNOWLEDGE_BASE.md.
---

# HAIP Research Protocol

## When to Use
- KB doesn't have the answer to a domain question
- New module being specced needs domain input
- Competitive landscape changes (new PMS features, pricing updates)
- Integration research (new OTA APIs, channel manager updates, payment gateway changes)
- Compliance research (new regulations, regional requirements)

## Research Sources (Priority Order)
1. **Vendor documentation** — Apaleo (apaleo.dev), Mews (docs.mews.com), Oracle OPERA docs
2. **Industry reports** — Skift, Hotel Tech Report, Hospitality Net, Phocuswire
3. **Standards bodies** — HTNG, OpenTravel Alliance, AHLA
4. **Developer communities** — GitHub issues/discussions, Stack Overflow, Reddit r/hotelmanagement
5. **Trade publications** — Hotel Management, Lodging Magazine, Hospitality Technology
6. **API documentation** — SiteMinder, DerbySoft, Stripe hospitality, Adyen hospitality

## Output Format
Every research output must include:
- Clear factual answer with data/percentages where available
- Source URLs (not paraphrased — actual links)
- Recommendation for HAIP (MVP priority, post-MVP, or not needed)
- Flag anything that contradicts existing KB content

## After Research
1. Update `kb/HAIP_KNOWLEDGE_BASE.md` with new findings
2. Save raw research to `kb/research/` with descriptive filename
3. If research changes a build decision, update `HAIP_BUILD_PLAN.md`
