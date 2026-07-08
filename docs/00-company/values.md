# Company Values

| Field | Value |
| --- | --- |
| Document ID | COMP-VALUES-001 |
| Status | Active |
| Owner | Clada Systems Leadership |
| Review cycle | Quarterly |
| Last reviewed | 2026-07-08 |

This document defines the operating values that should guide Clada Systems decisions. Values are useful only when they change behaviour, so each value includes the decisions it should influence.

## Why This Exists

Clada Systems is building operational software for businesses that rely on trust, timing, documents, customer communication, and professional execution. A vague culture document is not enough. The company needs values that can guide product strategy, engineering trade-offs, customer decisions, and AI-assisted development.

These values sit below the [Constitution](../CONSTITUTION.md) and alongside [The Clada Way](../THE_CLADA_WAY.md). They explain how the company should behave when the answer is not obvious.

## Values

### Customer Reality

Real customer operations outrank imagined workflows.

Contractor-led businesses operate under time pressure. Leads arrive unpredictably, documents are incomplete, customers need reassurance, staff context is fragmented, and operational decisions often happen outside neat software flows.

This value means Clada Systems should:

- observe how work is actually done before formalising a workflow;
- prefer field-tested language over internal terminology;
- design for incomplete information, interruptions, and handoffs;
- measure success by whether customers rely on the system in real operations.

It rules out building features only because they are elegant internally.

### Documentation First Development

Important work should be understood before it is implemented.

Documentation First Development does not mean writing long documents for every minor change. It means that meaningful changes to product behaviour, platform boundaries, security, data handling, customer commitments, or automation should be described before or with the implementation.

This value means Clada Systems should:

- write feature specifications before meaningful product work;
- create ADRs for material architecture and platform decisions;
- keep documentation accurate enough for humans and AI coding agents to act safely;
- treat broken or stale documentation as a production defect.

### Product Before Technology

Technology earns its place by improving the product.

Clada Systems may use AI, automation, integrations, analytics, and workflow engines, but none of them are the company identity. The product story is operational trust for contractor-led businesses.

This value means Clada Systems should:

- describe customer outcomes before technical mechanisms;
- use automation where it makes work faster, safer, clearer, or more reliable;
- keep human review where the decision affects compliance, customer submissions, or business-critical records;
- avoid using technical novelty as a substitute for product quality.

### Trust As A Product Feature

Trust is not a support function. It is part of the product.

Clada OS handles operational data, customer information, documents, and decisions that may affect revenue and reputation. Users must be able to understand what the system has done, what remains open, and where human judgement is required.

This value means Clada Systems should:

- design visible status, audit trails, and review points;
- avoid silent changes to important records;
- protect sensitive customer and business data;
- write copy that is precise rather than reassuring by exaggeration;
- treat reliability, privacy, and consistency as core requirements.

### Simplicity

Simple systems are easier to trust, maintain, sell, support, and expand.

Simplicity is not minimalism for its own sake. It is the discipline of making the important workflow clear and removing avoidable complexity.

This value means Clada Systems should:

- choose understandable workflows over clever interaction patterns;
- keep data models explicit;
- reduce duplicate concepts and unclear terminology;
- avoid premature generalisation;
- make the next action visible to the user.

### Engineering Discipline

Operational software must be built with care.

Engineering discipline protects customer trust and company speed. A system that is hard to understand becomes hard to improve.

This value means Clada Systems should:

- favour small, reviewable changes;
- preserve type safety and validation at system boundaries;
- keep business rules discoverable;
- verify changes according to risk;
- document technical decisions that future contributors will need to understand.

### Reusable Systems

Reuse should emerge from proven patterns, not speculation.

Clada OS must become a platform, but the platform should be taught by SolarGRANT Pro and other real workflows over time. The company should not build an abstract framework before it has enough customer evidence.

This value means Clada Systems should:

- identify repeated workflow patterns;
- extract platform capabilities when reuse is likely and valuable;
- keep module-specific rules inside the module where they belong;
- document extraction candidates before converting them into platform concepts.

### Long-Term Stewardship

Clada Systems should make decisions that remain understandable years later.

Long-term thinking does not mean slow execution. It means avoiding shortcuts that make the company harder to operate, the platform harder to trust, or the product harder to explain.

This value means Clada Systems should:

- maintain the Clada Operating Manual as the source of truth;
- keep company, platform, and module terminology stable;
- avoid business commitments the product cannot support;
- prefer durable customer value over short-term noise.

### Continuous Improvement

Every cycle should leave the company and platform clearer.

Continuous improvement is a practical habit. It includes small documentation fixes, test improvements, naming corrections, workflow simplification, support learnings, and post-release cleanup.

This value means Clada Systems should:

- treat small quality improvements as part of normal delivery;
- review what each sprint taught the company;
- update documentation when reality changes;
- make future work easier without widening scope unnecessarily.

## How Future Decisions Should Use These Values

When a decision is contested, use these values as a decision checklist:

1. What does customer reality say?
2. Is the product outcome clear before the technology choice?
3. Does the decision increase or weaken trust?
4. Is the solution as simple as the problem allows?
5. Does the work preserve engineering discipline?
6. Is reuse justified now, or should the work stay module-specific?
7. Will the decision still make sense when revisited in a future milestone?

If two values appear to conflict, the [Constitution](../CONSTITUTION.md) and relevant ADRs decide the tie.

## Related Documents

- [Mission](mission.md)
- [Strategy](strategy.md)
- [Constitution](../CONSTITUTION.md)
- [The Clada Way](../THE_CLADA_WAY.md)
- [Engineering Standards](../03-engineering/ENGINEERING_STANDARDS.md)
- [Documentation Standard](../DOCUMENTATION_STANDARD.md)
