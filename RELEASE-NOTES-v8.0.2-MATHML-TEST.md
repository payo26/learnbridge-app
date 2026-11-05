# Release notes: v8.0.2

This localhost-only candidate replaces custom fraction positioning with native
MathML. It keeps the complete expression in one mathematical layout so that
fraction bars, variables, operators and stretching brackets share a common
baseline.

The candidate also cleans raw Markdown and escaped LaTeX artefacts, converts
short numeric slash fractions in prose, preserves year ranges such as
`2026/2027`, invalidates the old browser lesson presentation cache, and adds
generation guidance for complete mathematical expressions.

Automated verification covers the exact reported equation, bracketed
fractions, slash fractions, escaped LaTeX, curriculum integrity, subscriber
entitlements, Paystack plan configuration and illustration validation.
