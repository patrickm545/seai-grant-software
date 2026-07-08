# Product

| Field | Value |
| --- | --- |
| Document ID | PROD-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Product |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

This section defines the product model for Clada OS and the first product module, SolarGRANT Pro.

## Product Architecture

Clada OS is the platform. Product modules sit on top of shared platform capabilities. SolarGRANT Pro is the first module and should teach the platform which capabilities deserve to become reusable.

The canonical platform architecture and capability ownership model lives in [../01-platform/README.md](../01-platform/README.md).

## Documents

- [CLADA_OS_PRODUCT_MODEL.md](CLADA_OS_PRODUCT_MODEL.md): platform and module model.
- [SOLARGRANT_PRO_MODULE.md](SOLARGRANT_PRO_MODULE.md): first product module context and boundaries.
- [../01-platform/PRODUCT_COMPOSITION.md](../01-platform/PRODUCT_COMPOSITION.md): how products compose Clada OS capabilities.

## Product Decision Rule

Before building a product capability, decide whether it is:

1. a SolarGRANT Pro module capability,
2. a Clada OS platform capability, or
3. an experiment that should stay narrow until validated.

The decision should be visible in feature specs and ADRs when the scope is meaningful.
