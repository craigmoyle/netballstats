FROM rocker/r-ver:4.5.2

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

RUN R -q -e "install.packages(c('DBI','RSQLite','dplyr','httr','jsonlite','plumber','purrr','remotes','tidyr'), repos='https://cloud.r-project.org')" \
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
