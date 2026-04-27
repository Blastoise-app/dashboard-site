#!/usr/bin/env bash
# Project-level override of the inherited Domain Restricted Sharing policy
# (constraints/iam.allowedPolicyMemberDomains) to additionally allow `allUsers`.
# The org's existing customer-id allowlist is preserved via inheritFromParent.
# Then grants `allUsers` invoker on the blocking auth Cloud Run service.
#
# Why: Identity Platform calls blocking auth functions unauthenticated at the
# IAM layer (validation happens via a signed JWT in the request body, which
# firebase-functions verifies internally). The standard pattern per Firebase
# docs is `allUsers` invoker. Without this override the function returns 403
# on every call from IdP, breaking sign-in for new users.
#
# Scope: this override applies only to project marketing-dashboard-site. Other
# projects in the blastoise.app org keep the strict policy.

set -euo pipefail

PROJECT_ID="marketing-dashboard-site"

cat > /tmp/relax-policy.yaml <<EOF
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allowedValues:
  - allUsers
  inheritFromParent: true
EOF

echo "Setting project-level org policy override (inherits org allowlist + allows allUsers)…"
gcloud resource-manager org-policies set-policy /tmp/relax-policy.yaml \
  --project="$PROJECT_ID"

echo
echo "Waiting 10s for policy propagation…"
sleep 10

echo "Granting allUsers invoker on the blocking auth function:"
gcloud run services add-iam-policy-binding beforecreateuser \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/run.invoker \
  --project="$PROJECT_ID"

echo
echo "✓ Done. Test sign-in with an unauthorized email should now produce a clean rejection (not a 403)."
