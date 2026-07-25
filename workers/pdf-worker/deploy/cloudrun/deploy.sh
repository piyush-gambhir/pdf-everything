#!/usr/bin/env bash
set -euo pipefail

# ── Deploy pdf-worker to GCP Cloud Run ───────────────────────────────────────
#
# Usage:
#   ./deploy/cloudrun/deploy.sh                # deploy latest
#   ./deploy/cloudrun/deploy.sh --from-ghcr    # copy the published GHCR image
#
# Prerequisites (one-time):
#   gcloud auth login
#   gcloud config set project "${GCP_PROJECT_ID}"
#   gcloud services enable run.googleapis.com artifactregistry.googleapis.com
#
#   # Create Artifact Registry repo
#   gcloud artifacts repositories create pdf-everything \
#     --repository-format=docker --location="${GCP_REGION}" --description="Docker images"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT_DIR}"

GCP_PROJECT_ID="${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"
GCP_REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-pdf-worker}"
REPO="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/pdf-everything/${SERVICE_NAME}"
TAG="${REPO}:$(git rev-parse --short HEAD)"

FROM_GHCR=0
for arg in "$@"; do
  case "${arg}" in
    --from-ghcr) FROM_GHCR=1 ;;
  esac
done

# ── Build ────────────────────────────────────────────────────────────────────
if [[ "${FROM_GHCR}" -eq 1 ]]; then
  SOURCE_IMAGE="${SOURCE_IMAGE:-ghcr.io/piyush-gambhir/pdf-everything-pdf-worker:latest}"
  echo "[deploy] Copying ${SOURCE_IMAGE}"
  docker pull "${SOURCE_IMAGE}"
  docker tag "${SOURCE_IMAGE}" "${TAG}"
  docker push "${TAG}"
else
  echo "[deploy] Building via Cloud Build..."
  gcloud builds submit \
    --tag="${TAG}" \
    --project="${GCP_PROJECT_ID}" \
    --timeout=600s \
    --gcs-log-dir="gs://${GCP_PROJECT_ID}_cloudbuild/logs" \
    .
fi

# ── Deploy ───────────────────────────────────────────────────────────────────
echo "[deploy] Deploying ${SERVICE_NAME} to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${TAG}" \
  --region="${GCP_REGION}" \
  --platform=managed \
  --port=8010 \
  --memory=2Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=60s \
  --concurrency=10 \
  --allow-unauthenticated \
  --project="${GCP_PROJECT_ID}"

# Set API_TOKEN via:
#   gcloud run services update "${SERVICE_NAME}" --region="${GCP_REGION}" \
#     --set-env-vars="API_TOKEN=your-secret" --project="${GCP_PROJECT_ID}"
# Or use Secret Manager:
#   --set-secrets="API_TOKEN=pdf-worker-token:latest"

# ── Smoke check ──────────────────────────────────────────────────────────────
SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${GCP_REGION}" --format='value(status.url)' --project="${GCP_PROJECT_ID}")"

echo "[deploy] Smoke check: GET ${SERVICE_URL}/health ..."
HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${SERVICE_URL}/health" || true)"

if [[ "${HTTP_STATUS}" == "200" ]]; then
  echo "[deploy] Smoke check passed (HTTP ${HTTP_STATUS})."
else
  echo "[deploy] WARNING: Smoke check returned HTTP ${HTTP_STATUS}." >&2
fi

echo "[deploy] Done. URL: ${SERVICE_URL}"
