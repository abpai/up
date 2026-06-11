# @andypai/up

CLI for uploading local files to Up and getting back public share links.

## Install

```bash
npm install -g @andypai/up
up --version
```

## Usage

```bash
up ./file.pdf
up --collection ./a.png ./b.png
up --json ./file.pdf
up setup
```

## Config

Persistent defaults live in `~/.up/config.toml`.

The easiest way to create them is:

```bash
up setup
```

For headless terminals, CI, or dotfile automation:

```bash
up setup --token "$UP_TOKEN" --yes
up setup --api https://up.example.com --app https://up.example.com --token "$UP_TOKEN" --no-open --mode single --yes
```

For local authenticated uploads, create an API token in the Up dashboard and
paste it into `up setup`.

For CI or scripts, prefer:

```bash
export UP_TOKEN=up_your_token
up --json ./artifact.zip
```
