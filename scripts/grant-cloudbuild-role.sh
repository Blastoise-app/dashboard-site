#!/usr/bin/env bash
# One-time fix for new Firebase projects: grant the default compute service
# account the Cloud Build role, so Cloud Functions deploys can build images.
set -euo pipefail

PROJECT_ID="marketing-dashboard-site"
PROJECT_NUMBER="608460171867"
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA}" \
  --role="roles/cloudbuild.builds.builder"
