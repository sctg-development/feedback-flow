# Application Feedback Flow

Feedback Flow is an application designed to manage the feedback from product testers. 

This application is intended for product testers who wish to test a product and provide their opinion on it. The management of products offered by sellers is outside the scope of this application. 

The application allows the tester to manage their purchases, feedback, and refunds. 

Thus, in case of a dispute with a seller, the tester can prove that they have indeed purchased the product and provided their opinion on it, and that this opinion has been published by the platform.

## Template

The application is based on the [Vite, Auth0 & HeroUI Template](https://github.com/sctg-development/vite-react-heroui-auth0-template), which is a starter template for a React 19 application with Auth0 and HeroUI 2.7, along with a backend running on a Worker C.

## Hardware Architecture

The application is deployed on a CDN as a static SPA (Single Page Application). It communicates with a REST API deployed on a free Cloudflare worker.

## Data Analysis

- A product tester is someone who tests a product and provides feedback on it. 
- A product is an item or service that is tested by a tester.
- The seller is the person who sells the product.
- Feedback is the opinion given by the tester about the product.

## Testing and Feedback Process

The testing and feedback process is as follows:

- The seller offers a product to a tester.
- The tester purchases the product.
- The tester provides the seller with a screenshot of the proof of purchase.
- The tester tests the product.
- The tester gives their opinion on the product.
- The feedback is published on the feedback platform.
- The tester provides a screenshot of the published feedback.
- The seller refunds the tester.

There may be a delay between the purchase and the refund. Additionally, the refund amount may differ from the purchase amount. Therefore, the following information should be stored:

## Data to Store

- Tester's name
- Tester's ID (a single tester can have multiple IDs)
- Purchase date
- Order number
- Purchase amount
- Screenshot of the proof of purchase
- Date feedback was submitted
- Date feedback was published
- Screenshot of the published feedback
- Date feedback was sent to the seller
- Refund date
- Refund amount

## Permissions

| permission | description |
|------------|-------------|
| admin:api  | Administer the API |
| read:api  | Read one's own feedback data |
| write:api  | Write one's own feedback data |

## Application Features

- Add a tester (admin:api)
- Add an ID to a tester (admin:api)
- Add a product to test (write:api)
- Add a purchase (write:api)
- Add feedback (write:api)
- Publish feedback (write:api)
- Send feedback to the seller (write:api)
- Record a refund (write:api)
- View non-refunded feedbacks (read:api)
- View refunded feedbacks (read:api)

## Security

Authentication is handled by Auth0. The system is provided by the template. It is an OAuth 2.0 process that runs in the browser. The browser receives a JWT token, which it sends to the API. The API verifies the token and grants or denies access to the resource based on the permissions included in the token.

## REST API

The REST API exchanges all objects in JSON format. The API provides the following endpoints:

### Tester Management

- **POST `/api/tester`** - Add a tester to the database (their ID is automatically generated with a UUID) - needs admin:api permission
  - Request: `{name /* tester's name */: string}`
  - Response: `{success: boolean, uuid /* tester's account UUID */: string}`

- **POST `/api/tester/ids`** - Add an ID to the authenticated tester - needs admin:api permission
  - Request: `{name /* tester's name */: string, id /* additional identifier */: string}`
  - Response: `{success: boolean, name: string, ids: [string]}`

- **GET `/api/tester`** - Get information about the authenticated tester - needs admin:api permission
  - Response: `{success: boolean, data: {uuid: string, nom: string, ids: [string]}}`

### Purchase Management

- **POST `/api/purchase`** - Add a purchase to the database - needs write:api permission
  - Request: `{date /* purchase date in YYYY-MM-DD format */: string, order /* order number */: string, description /* description of the item */: string, amount /* purchase amount */: number, screenshot /* webp image with the largest side < 1024px, base64 encoded, max 1MB */: string}`
  - Response: `{success: boolean, id /* purchase UUID */: string}`

- **GET `/api/purchase/:id`** - Get information about a specific purchase - needs read:api permission
  - Response: `{success: boolean, data: {id: string, date: string, order: string, description: string, amount: number, screenshot: string}}`

- **GET `/api/purchase`** - Get a list of the authenticated tester's purchases - needs read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`

- **GET `/api/purchases/not-refunded`** - Get a list of the authenticated tester's not-refunded purchases - needs read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`
  
- **GET `/api/purchases/refunded`** - Get a list of the authenticated tester's refunded purchases - needs read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`

### Feedback Management

- **POST `/api/feedback`** - Add feedback to the database - needs write:api permission
  - Request: `{date /* format YYYY-MM-DD */: string, purchase /* purchase UUID */: string, feedback /* optional feedback left */: string}`
  - Response: `{success: boolean, id: string}`

- **POST `/api/publish`** - Record the publication of feedback - needs write:api permission
  - Request: `{date /* format YYYY-MM-DD */: string, purchase /* purchase UUID */: string, screenshot /* webp image with the largest side < 1024px, base64 encoded, max 1MB */: string}`
  - Response: `{success: boolean, id: string}`

- **GET `/api/publish/:id`** - Get information about a specific publication - needs read:api permission
  - Response: `{success: boolean, data: {date: string, purchase: string, screenshot: string}}`

### Refund Management

- **POST `/api/refund`** - Record a refund - needs write:api permission
  - Request: `{date /* recording date in YYYY-MM-DD format */: string, purchase /* purchase UUID */: string, refunddate /* refund date in YYYY-MM-DD format */: string, amount /* refunded amount */: number}`
  - Response: `{success: boolean, id: string}`

- **GET `/api/refund/:id`** - Get information about a specific refund - needs read:api permission
  - Response: `{success: boolean, data: {date: string, purchase: string, refunddate: string, amount: number}}`