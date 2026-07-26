#!/usr/bin/env bash
set -euo pipefail

# ── Deploy pdf-worker to GCP Cloud Run ───────────────────────────────────────
#
# Usage:
#   ./deploy/cloudrun/deploy.sh                # deploy latest
#   ./deploy/cloudrun/deploy.sh --from-ghcr    # copy the published GHCR image
#
# Configuration:
#   ALLOW_UNAUTHENTICATED=false  # private Cloud Run IAM (safe default)
#   API_TOKEN_SECRET=            # Secret Manager secret; required if public
#   API_TOKEN_SECRET_VERSION=1   # pin the deployed secret version
#   CONCURRENCY=2                # Chromium-heavy requests per instance
#
# Prerequisites (one-time):
#   gcloud auth login
#   gcloud config set project "${GCP_PROJECT_ID}"
#   gcloud services enable \
#     run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
#
#   # Create Artifact Registry repo
#   gcloud artifacts repositories create pdf-everything \
#     --repository-format=docker --location="${GCP_REGION}" --description="Docker images"
#   gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT_DIR}"

GCP_PROJECT_ID="${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"
GCP_REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-pdf-worker}"
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-false}"
API_TOKEN_SECRET="${API_TOKEN_SECRET:-}"
API_TOKEN_SECRET_VERSION="${API_TOKEN_SECRET_VERSION:-1}"
CONCURRENCY="${CONCURRENCY:-2}"
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
  docker buildx imagetools create --tag "${TAG}" "${SOURCE_IMAGE}"
else
  echo "[deploy] Building via Cloud Build..."
  gcloud builds submit \
    --config=deploy/cloudrun/cloudbuild.yaml \
    --substitutions="_IMAGE=${TAG}" \
    --project="${GCP_PROJECT_ID}" \
    --timeout=600s \
    .
fi

# ── Deploy ───────────────────────────────────────────────────────────────────
ACCESS_ARGS=(--no-allow-unauthenticated)
SECRET_ARGS=()

if [[ "${ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  if [[ -z "${API_TOKEN_SECRET}" ]]; then
    echo "[deploy] ERROR: public access requires API_TOKEN_SECRET." >&2
    echo "[deploy] Store the worker token in Secret Manager and pass its secret name." >&2
    exit 1
  fi
  ACCESS_ARGS=(--allow-unauthenticated)
  SECRET_ARGS=(--set-secrets="API_TOKEN=${API_TOKEN_SECRET}:${API_TOKEN_SECRET_VERSION}")
elif [[ "${ALLOW_UNAUTHENTICATED}" != "false" ]]; then
  echo "[deploy] ERROR: ALLOW_UNAUTHENTICATED must be true or false." >&2
  exit 1
elif [[ -n "${API_TOKEN_SECRET}" ]]; then
  echo "[deploy] ERROR: do not combine Cloud Run IAM with API_TOKEN_SECRET." >&2
  echo "[deploy] Both authenticate through the Authorization header." >&2
  exit 1
fi

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
  --concurrency="${CONCURRENCY}" \
  "${ACCESS_ARGS[@]}" \
  "${SECRET_ARGS[@]}" \
  --project="${GCP_PROJECT_ID}"

# ── Smoke check ──────────────────────────────────────────────────────────────
SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${GCP_REGION}" --format='value(status.url)' --project="${GCP_PROJECT_ID}")"

echo "[deploy] Smoke check: GET ${SERVICE_URL}/health ..."
CURL_ARGS=()
if [[ "${ALLOW_UNAUTHENTICATED}" == "false" ]]; then
  IDENTITY_TOKEN="$(gcloud auth print-identity-token)"
  CURL_ARGS+=(--header "Authorization: Bearer ${IDENTITY_TOKEN}")
fi

HTTP_STATUS="$(
  curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
    "${CURL_ARGS[@]}" "${SERVICE_URL}/health" || true
)"

if [[ "${HTTP_STATUS}" == "200" ]]; then
  echo "[deploy] Smoke check passed (HTTP ${HTTP_STATUS})."
else
  echo "[deploy] WARNING: Smoke check returned HTTP ${HTTP_STATUS}." >&2
fi

echo "[deploy] Done. URL: ${SERVICE_URL}"
