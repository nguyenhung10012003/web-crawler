FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV YARN_VERSION=4.6.0

RUN corepack enable && corepack prepare yarn@${YARN_VERSION}

# Install latest Chrome dev packages and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this also installs the necessary libs to make the bundled version of Chromium that Puppeteer installs work.
RUN apt update \
  && apt install -y wget gnupg unzip ca-certificates --no-install-recommends \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && sh -c 'echo "deb http://ftp.us.debian.org/debian bookworm main non-free" >> /etc/apt/sources.list.d/fonts.list' \
  && apt update \
  && apt purge --auto-remove -y unzip \
  && apt install -y \
  fonts-freefont-ttf \
  fonts-ipafont-gothic \
  fonts-kacst \
  fonts-liberation \
  fonts-thai-tlwg \
  fonts-wqy-zenhei \
  git \
  libxss1 \
  lsb-release \
  procps \
  xdg-utils \
  xvfb \
  xauth \
  --no-install-recommends \
  # Disable chrome auto updates, based on https://support.google.com/chrome/a/answer/9052345
  && mkdir -p /etc/default && echo 'repo_add_once=false' > /etc/default/google-chrome \
  \
  # Install chrome
  && wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -nv \
  && apt install --fix-missing -yq ./google-chrome-stable_current_amd64.deb && rm ./google-chrome-stable_current_amd64.deb \
  \
  # Add user so we don't need --no-sandbox.
  && groupadd -r myuser && useradd -r -g myuser -G audio,video myuser \
  && mkdir -p /home/myuser/Downloads \
  && chown -R myuser:myuser /home/myuser \
  \
  && mkdir -p /etc/opt/chrome/policies/managed \
  && echo '{ "CommandLineFlagSecurityWarningsEnabled": false }' > /etc/opt/chrome/policies/managed/managed_policies.json \
  && echo '{ "ComponentUpdatesEnabled": false }' > /etc/opt/chrome/policies/managed/component_update.json \
  # Cleanup
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /src/*.deb \
  && apt clean -y && apt autoremove -y \
  && rm -rf /root/.npm \
  # This is needed to remove an annoying error message when running headful.
  && mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

FROM base AS builder

COPY . .
COPY package.json yarn.lock .yarnrc.yml ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN yarn install --immutable
RUN yarn build

FROM base AS prod
ENV NODE_ENV=production

COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=builder /app/node_modules node_modules
RUN yarn install --immutable
COPY --from=builder /app/dist dist

ENV PORT=8080
EXPOSE 8080
CMD ["yarn", "run", "start"]
