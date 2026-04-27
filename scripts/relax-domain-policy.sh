#!/usr/bin/env bash
# Override the org-level Domain Restricted Sharing policy at the project level
# so we can grant `allUsers` invoker on the blocking auth Cloud Run service.
# (Identity Platform calls blocking functions unauthenticated at the IAM layer
# and validates a signed JWT in the body — so allUsers is the standard pattern.)
set -euo pipefail

PROJECT_ID="marketing-dashboard-site"

cat > /tmp/relax-policy.yaml <<EOF
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allValues: ALLOW
EOF

gcloud resource-manager org-policies set-policy /tmp/relax-policy.yaml \
  --project="$PROJECT_ID"

echo
echo "Policy override applied. Now granting allUsers invoker on the function:"
sleep 5
gcloud run services add-iam-policy-binding beforecreateuser \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/run.invoker \
  --project="$PROJECT_ID"
