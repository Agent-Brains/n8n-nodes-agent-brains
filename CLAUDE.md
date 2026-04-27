## Project overview

This project is a mono-repo for AgentBrains n8n node packages.
Each package under packages/* is published independently.

## Tech stack

- Node.js
- TypeScript
- N8n
- AgentBrains API

## Architecture

The project is structured as follows:
- packages/
  - shared/
    - credentials/ # Shared credentials module for all nodes, and is copied to each node package
    - icons/ # Shared icons module for all nodes, and is copied to each node package
    - nodes/constants.ts # Shared constants module for all nodes, and is copied to each node package
  - * # Individual node packages
    - nodes/ # Node modules for each package
- scripts/ # Scripts for the project management

## Commands

- `npm run sync` # Sync shared modules to each node package - copies shared modules to each node package
- `npm run release:all` # Release all node packages - publishes all node packages to npm
- `npm run dev` # In each node package, run the development server
