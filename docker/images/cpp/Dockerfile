FROM gcc:13-bookworm

RUN useradd -m -s /bin/bash sandbox && \
    rm -rf /usr/bin/wget /usr/bin/curl /usr/bin/nc /usr/bin/ping 2>/dev/null || true

USER sandbox
WORKDIR /tmp/code

ENTRYPOINT ["/bin/bash"]
