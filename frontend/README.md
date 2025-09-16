This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Radiation dashboard configuration

The radiation dashboard consumes two backend endpoints:

- `GET /api/v1/readings` (`http://213.199.35.129:5002/api/v1/readings`) for live radiation counts displayed on the chart.
- `POST /api/radiation` (`http://213.199.35.129:5002/api/radiation`) to store the Vbas, Vhaut and Delta values.

Set the following environment variables before running the frontend so the dashboard can reach these services in each environment:

```bash
# WebSocket stream that pushes the most recent reading every few seconds
NEXT_PUBLIC_WS_URL=wss://yourdomain/ws

# Base URL for REST APIs (defaults to http://213.199.35.129:5002 when unset)
NEXT_PUBLIC_API_BASE_URL=http://213.199.35.129:5002
```

For local development you can point `NEXT_PUBLIC_API_BASE_URL` to `http://localhost:5002` while keeping a matching WebSocket URL (for example `ws://localhost:5002`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

