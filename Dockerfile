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

WORKDIR /opt/render/project/src

COPY . /opt/render/project/src

RUN R -q -e "install.packages('renv', repos='https://cloud.r-project.org'); renv::consent(provided = TRUE); renv::restore(prompt = FALSE)"

ENV NETBALL_STATS_REPO_ROOT=/opt/render/project/src
ENV NETBALL_STATS_HOST=0.0.0.0
ENV NETBALL_STATS_PORT=10000

RUN useradd -u 1000 -m -s /bin/false netballstats \
  && chown -R netballstats:netballstats /opt/render/project/src

EXPOSE 10000

USER netballstats

CMD ["Rscript", "-e", "pr <- plumber::plumb('api/plumber.R'); pr$run(host = Sys.getenv('NETBALL_STATS_HOST', '0.0.0.0'), port = as.integer(Sys.getenv('PORT', Sys.getenv('NETBALL_STATS_PORT', '10000'))))"]
