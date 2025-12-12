# AI Assistant Rules for IronBarber App

This document outlines the technical stack and guidelines for developing the IronBarber application. Adhering to these rules ensures consistency, maintainability, and optimal performance.

## Tech Stack Overview

*   **React**: The core library for building the user interface.
*   **TypeScript**: Used for type-safe development, enhancing code quality and developer experience.
*   **React Router DOM**: Manages client-side routing, enabling navigation between different pages.
*   **Tailwind CSS**: A utility-first CSS framework for rapid and consistent styling. Includes custom dark mode and a defined color palette.
*   **Vite**: The build tool providing a fast development experience.
*   **Material Symbols Outlined**: Google Fonts icon library for visual elements.
*   **Lucide React**: An additional icon library available for use.
*   **shadcn/ui & Radix UI**: A collection of pre-built, accessible UI components available for use.
*   **React Context API**: Utilized for global state management across the application.
*   **Local Storage**: Employed for client-side data persistence, especially for mock data.

## Library Usage Guidelines

To maintain consistency and leverage the strengths of our chosen libraries, please follow these guidelines:

*   **UI Components**:
    *   **Prioritize shadcn/ui and Radix UI components** for common UI patterns (e.g., buttons, forms, dialogs, tables).
    *   If a specific component is not available in shadcn/ui or Radix UI, create custom React components using **Tailwind CSS** for styling.
    *   Avoid creating new components in existing files; always create a new, dedicated file for each new component.
*   **Styling**:
    *   **Exclusively use Tailwind CSS** for all styling. Apply utility classes directly in JSX.
    *   Avoid writing custom CSS in `.css` files unless it's for global resets or specific third-party library overrides.
    *   Utilize the custom color palette and dark mode configurations defined in `index.html` (Tailwind config).
*   **Routing**:
    *   Use `react-router-dom` for all navigation and route management.
    *   Keep route definitions centralized in `src/App.tsx`.
*   **State Management**:
    *   For global application state (e.g., tenant, user, mock data), use the **React Context API** (`TenantContext`, `DataContext`).
    *   For component-specific local state, use React's `useState` hook.
*   **Icons**:
    *   Prefer `material-symbols-outlined` for general icons, as it's already integrated.
    *   `lucide-react` is also available and can be used for additional icon needs.
*   **Data Handling**:
    *   For mock data persistence, continue using `localStorage`.
    *   If a backend or database integration (e.g., Supabase) is introduced, adapt data handling accordingly, but for now, `localStorage` is the source of truth for mock data.
*   **File Structure**:
    *   Place pages in `src/pages/`.
    *   Place components in `src/components/`.
    *   Place types in `src/types/`.
    *   Directory names must be all lower-case.
*   **Code Quality**:
    *   Write clean, readable, and maintainable TypeScript code.
    *   Ensure all new components are responsive.
    *   Avoid over-engineering; implement features simply and elegantly.
    *   Do not use `try/catch` for error handling unless explicitly requested, to allow errors to bubble up.