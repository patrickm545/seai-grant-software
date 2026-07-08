# Feature Decision Framework

## Purpose

This document decides whether a feature should be added to Clada OS or delayed.

Every meaningful new feature should be judged against this framework before implementation.

## Feature approval questions

Before building a feature, answer:

1. Does this help installers win more jobs?
2. Does this reduce admin work?
3. Does this improve customer experience?
4. Does this make the sales or grant workflow clearer?
5. Does this support the long-term Clada OS platform vision?
6. Is this needed for the current sprint or can it wait?
7. Does this create unnecessary complexity?
8. Can this be built as a reusable Clada OS capability rather than a solar-only one-off?
9. Does this protect trust, reliability, and GDPR expectations?
10. Can the feature be explained simply to a non-technical installer?

## Decision categories

### Build now

Use this when the feature directly supports the current sprint goal and improves the core workflow.

### Design now, build later

Use this when the feature is strategically important but not needed for the immediate sprint.

### Park for future

Use this when the idea is useful but would distract from the MVP.

### Reject

Use this when the feature adds complexity, weakens the product, creates unclear value, or does not fit Clada OS.

## MVP rule

The MVP should focus on the smallest complete workflow that proves value for installers:

lead captured -> lead qualified -> installer follows up -> quote/proposal created -> customer progresses through grant/job workflow.

Anything outside this flow should be challenged before being built.
