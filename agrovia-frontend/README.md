# Agrovia Frontend

React + Vite + Tailwind frontend for the Agrovia Marketplace backend.

## Stack

- React
- Vite
- Tailwind CSS
- React Router DOM
- Axios
- TanStack Query
- Redux Toolkit
- Framer Motion
- Lucide React
- Zod

## Run

1. Copy the example env file and set the API URL:

```bash
copy .env.example .env
```

2. Start the app:

```bash
npm install
npm run dev
```

By default, the frontend expects the backend at `http://localhost:5000/api`.

## Features

- Dynamic product grid from the backend
- Category and region filters
- Product detail page
- Cart and wishlist integration
- Checkout form
- Delivery price calculator
- Auth flow with local token storage
- Role-based dashboard for buyer, seller, courier, and admin
