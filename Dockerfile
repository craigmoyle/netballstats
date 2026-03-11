FROM rocker/r-ver:4.5.2

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libcurl4-openssl-dev \
    libpq-dev \
    libssl-dev \
    libsodium-dev \
    libxml2-dev \
    pkg-config \
    make \
    zlib1g-dev \
    g++ \
  && rm -rf /var/lib/apt/lists/*

RUN R -q -e "required <- c('DBI','RPostgres','RSQLite','dplyr','httr','jsonlite','plumber','purrr','remotes','tidyr'); install.packages(required, repos='https://cloud.r-project.org'); missing <- setdiff(required, rownames(installed.packages())); if (length(missing)) stop(sprintf('Missing R packages after install: %s', paste(missing, collapse=', ')))" \
  && R -q -e "remotes::install_github('craigmoyle/superNetballR_updated')"

WORKDIR /opt/render/project/src

COPY . .

ENV NETBALL_STATS_REPO_ROOT=/opt/render/project/src
ENV NETBALL_STATS_DB=/opt/render/project/src/storage/netball_stats.sqlite
ENV NETBALL_STATS_HOST=0.0.0.0
ENV NETBALL_STATS_PORT=10000

RUN mkdir -p /opt/render/project/src/storage \
  && Rscript scripts/build_database.R

EXPOSE 10000

CMD ["Rscript", "-e", "pr <- plumber::plumb('api/plumber.R'); pr$run(host = Sys.getenv('NETBALL_STATS_HOST', '0.0.0.0'), port = as.integer(Sys.getenv('PORT', Sys.getenv('NETBALL_STATS_PORT', '10000'))))"]
