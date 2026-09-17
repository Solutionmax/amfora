# Building Amfora without accumulating unused cache

Use `make build TAG=1.0.0-example` for a local, native-platform image. Publishing is explicit: `make build TAG=1.0.0-example MODE=push` builds AMD64/ARM64 and pushes the version tag and `latest` to GHCR. Neither command changes package versions.

The script uses a dedicated `amfora-builder` with `infra/buildkitd.toml`. Native BuildKit garbage collection targets **4 GB of unused cache**, reserves 1 GB for useful cache, and aims to retain 10 GB of free disk space. Active builds can temporarily exceed these targets. Cached layers are reused; builds no longer force `--no-cache`.

After successful and failed builds, the wrapper also runs a bounded cache prune. `make clean` runs the same operation manually. It never stops the application, deletes application volumes, or removes images. Buildx must support `--max-used-space`, `--reserved-space`, and `--min-free-space` (validated with Buildx 0.30.1).

For an existing builder, the TOML configuration is only applied when it is created. Post-build pruning still applies on every build. Finish active builds before deliberately recreating a builder to replace its configuration; this discards its cache, not application data.

Inspect storage with:

```sh
docker system df
docker buildx du --builder amfora-builder
docker image ls amfora
docker ps -a --filter ancestor=amfora:YOUR_TAG
```

Image retention is separate from build cache. Keep the running image and one tested rollback image. Remove older Amfora tags only after checking running and stopped containers that reference them. Do not use global `docker system prune` or `docker volume prune` as an Amfora build cleanup routine.

Docker's [garbage collection documentation](https://docs.docker.com/build/cache/garbage-collection/) describes the native thresholds.
