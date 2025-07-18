
# Project Summary: Syllabi.io Frontend

This is a modern, full-stack web application built with Next.js and TypeScript, designed to be a platform for creating and managing AI-powered chatbots and integrations.

## Core Technologies

*   **Framework:** [Next.js](https://nextjs.org/) (using Turbopack for development)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI:** [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), and [shadcn/ui](https://ui.shadcn.com/)
*   **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL)
*   **AI/Chat:** Vercel AI SDK and OpenAI libraries

## High-Level Architecture

The application is structured as a Next.js project with a clear separation of concerns between the frontend and backend logic.

*   **Frontend:** The frontend is built with React and Tailwind CSS, with a rich component library based on shadcn/ui. The application is a single-page application (SPA) with client-side routing handled by Next.js.
*   **Backend:** The backend is implemented using Next.js API routes and Supabase for database and authentication services.
*   **Database:** The project uses a PostgreSQL database managed by Supabase, with migrations located in the `supabase/migrations` directory.

## Key Features

*   **Authentication:** User authentication is handled by Supabase.
*   **Dashboard:** A comprehensive dashboard for managing chatbots, integrations, and other resources.
*   **Chatbots:** The core feature of the application is the ability to create, configure, and deploy AI-powered chatbots.
    *   **Chatbot Management:** Users can manage their chatbots, including their settings, skills, and channels.
    *   **Analytics:** The application provides analytics for chatbot usage.
    *   **Skills:** Chatbots can be extended with skills, which are custom functionalities that can be triggered by user input.
*   **Integrations:** The application integrates with several third-party services, including:
    *   Notion
    *   Slack
    *   Discord
    *   Google APIs
*   **In-browser Code Execution:** The application has experimental support for running Python and R code in the browser using Pyodide and WebR.

## Project Structure

The project is organized into the following directories:

*   `src/app`: The main application code, including pages, API routes, and components.
    *   `src/app/api`: API routes for handling backend logic.
    *   `src/app/dashboard`: The main dashboard interface.
        *   `src/app/dashboard/chatbots`: The interface for managing chatbots.
*   `src/components`: Reusable UI components.
*   `src/lib`: Shared libraries and utility functions.
*   `src/services`: Services for interacting with external APIs.
*   `supabase`: Supabase configuration and database migrations.
*   `integrations`: Integration-related assets and configurations.
*   `scripts`: Scripts for various development and deployment tasks.

## Getting Started

To run the application in a development environment, use the following command:

```bash
npm run dev
```

This will start the development server on [http://localhost:3000](http://localhost:3000).
