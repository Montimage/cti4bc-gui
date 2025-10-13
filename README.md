# CTI4BC GUI

## Overview
This is the graphic user interface for CTI4BC (Cyber Threat Intelligence and Information Sharing for Business Continuity).

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Folder Structure](#folder-structure)
- [Deployment](#deployment)

## Installation
Follow these steps to set up the project locally:

### Prerequisites
- **Node.js v16.14.0**
- **npm** (included with Node.js)

```bash
# Clone the repository
git clone https://github.com/Montimage/cti4bc-gui.git

# Navigate into the project directory
cd cti4bc-gui

# Install dependencies
npm install
```

## Usage
How to run the project in development mode:
```bash
npm start
```

This will start a local development server at `http://localhost:3000/`

## Environment Variables
Create a `.env` file in the root directory and define the required variables:
```env
REACT_APP_API_URL=https://your-api-url.com 
```

## Folder Structure
TBD

## Deployment

### Using Docker
To build and run the project using Docker:

#### 1. Build the Docker image
For **general users**:
```bash
docker build --build-arg REACT_APP_API_URL=https://your-api-url.com -t my-react-app .
```
For **Apple Silicon (M1/M2) or multi-platform builds**:
```bash
docker buildx build --platform linux/amd64 --build-arg REACT_APP_API_URL=https://your-api-url.com -t my-react-app --load .
```

#### 2. Run the container
```bash
docker run -p 3000:80 --name my-react-container my-react-app
```