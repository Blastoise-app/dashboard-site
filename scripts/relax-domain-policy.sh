#!/usr/bin/env bash
# Project-level override of the inherited Domain Restricted Sharing policy
# (constraints/iam.allowedPolicyMemberDomains), allowing all members for IAM
# bindings on this project only. Then grants `allUsers` invoker on the
# blocking auth Cloud Run service.
#
# Why allValues: ALLOW (and not a narrower allowedValues with `allUsers`):
# the legacy `iam.allowedPolicyMemberDomains` constraint only accepts customer
# IDs in its allowedValues list — it rejects `allUsers` as an invalid value.
# The newer `iam.managed.allowedPolicyMemberDomains` does accept it, but the
# org has the legacy version set, so a managed override at the project level
# doesn't take effect. Result: the only project-level escape hatch is
# allValues: ALLOW, which relaxes the constraint entirely for this project.
#
# Why this is okay for now: the marketing-dashboard-site project only hosts
# the SaaS itself. There's no other resource here that an accidental
# `allUsers` IAM binding could expose. Other projects in the blastoise.app
# org are unaffected.
#
# Why we need it: Identity Platform calls blocking auth functions
# unauthenticated at the IAM layer (the function validates a signed JWT in
# the request body, which firebase-functions verifies internally). Per
# Firebase docs the standard pattern is `allUsers` invoker. Without this
# override, IdP gets a 403 on every call, breaking sign-in for new users.

set -euo pipefail

PROJECT_ID="marketing-dashboard-site"

cat > /tmp/relax-policy.yaml <<EOF
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allValues: ALLOW
EOF

echo "Setting project-level org policy override (allValues: ALLOW)…"
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
