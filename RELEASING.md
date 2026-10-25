# Versioned releases

Release source from the default branch with an unused `vX.Y.Z` tag. The `Publish versioned containers` workflow builds the existing Docker recipes for Linux amd64 and arm64 and publishes version, commit, and latest tags to GHCR, with provenance and SBOM metadata. Repository maintainers make new packages public in GitHub package settings before announcing them.

For this release:

```sh
docker pull ghcr.io/piyush-gambhir/pdf-everything-api:0.1.2
docker pull ghcr.io/piyush-gambhir/pdf-everything-pdf-core-worker:0.1.2
docker pull ghcr.io/piyush-gambhir/pdf-everything-pdf-worker:0.1.2
```

Use a version tag or the published image digest to choose when to upgrade. Configure service credentials, API origins, and persistent storage according to the repository README and compose examples. Browser public environment values are compiled into Next.js assets; installations needing different browser origins must rebuild with the Dockerfile build arguments. Development containers and legacy deployment scripts are separate from these production image artifacts.

PDF Lambda image publication remains deferred. The existing Lambda publishing job runs only when `PUBLISH_PDF_LAMBDA` is explicitly enabled. AWS settings are unchanged.
