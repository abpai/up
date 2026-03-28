# @andypai/up

CLI for uploading local files to Up and getting back public share links.

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

For local authenticated uploads, create an API token in the Up dashboard and
paste it into `up setup`.

For CI or scripts, prefer:

```bash
export UP_TOKEN=up_your_token
up --json ./artifact.zip
```
