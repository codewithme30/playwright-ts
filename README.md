## Overview

This project implements an automated test suite to validate a distributed **data pipeline** consisting of four components:
- **Agent** – Reads an input file and sends data downstream.
- **Splitter** – Receives the stream, splits records across two targets.
- **Target 1 & Target 2** – Write received records to output files.

The validation ensures:
1. Data transmitted through the pipeline is complete and consistent.
2. No records are lost or duplicated.
3. The total input and output records match.
4. Logs are captured for each target for analysis.

Automation is built using **Playwright (TypeScript)** and **Docker Compose**, simulating all four hosts (containers) and performing end-to-end validation.

## Tech Stack

| Component | Tool/Framework |
|------------|----------------|
| Programming Language | TypeScript (Node.js v24.11.0) |
| Test Framework | Playwright |
| Containerization | Docker Compose |
| CI/CD | GitHub Actions |

## Local Setup & Prerequisites

Before running the tests locally, ensure the following are installed:

| Tool                    | Minimum Version | Command to Verify        |
|-------------------------|-----------------|--------------------------|
| Git                     | 2.30+           | `git --version`          |
| Node.js                 | 18+             | `node -v`                |
| npm                     | 9+              | `npm -v`                 |
| Docker Desktop / Engine | 27+             | `docker --version`       |
| Docker Compose          | v2+             | `docker compose version` |

## Running Tests Locally

### 1️. Clone the repository

    git clone https://github.com/<your-username>/assignment.git
    cd assignment

### 2. install dependencies
Navigate to the test project folder and install all Node.js packages.
    
    cd tests
    npm install
This installs Playwright, TypeScript utilities, and supporting libraries required for the test execution.

### 3. Ensure Docker Is Running
Make sure Docker Desktop or Docker Engine is active before running the tests.
Verify with:

    docker --version
    docker compose version
    docker info
If the Docker daemon is not running, start it manually or use:

    sudo systemctl start docker



### 4. Run test suite
From the /tests directory:

    npm test

This command will:

1. Build all containers (agent, splitter, target_1, target_2) using docker-compose.
2. Execute the Playwright test suite (pipeline.spec.ts).
3. Validate:
   * Output files are generated (output.txt, events.log).
   * Record counts match between input and output.
   * No missing or duplicate records exist.
4. Stop and clean up all containers after completion.