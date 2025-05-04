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
| backup:api  | Manage the database |

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

A Swagger ui is automatically generated for the API. It is available at `/docs`. The API is secured with Auth0. The API uses the same authentication process as the application. The API requires a JWT token to be sent in the `Authorization` header of each request. The token must be prefixed with `Bearer`.  
For easily adding the token, simply click on your name in the footer of the application. A modal will open with the token. Copy the token with the supplied button and paste it in the `Authorization` field in Swagger. The token is valid for 24 hours. The API uses the same permissions as the application. The API uses the same database as the application.  

The REST API exchanges all objects in JSON format. The API provides the following endpoints:

### Tester Management

- **GET `/api/testers`** - Retrieve all testers with pagination - requires admin:api permission
  - Optional parameters: `?page=1&limit=10&sort=name&order=asc`
  - Response: `{success: boolean, data: [{uuid: string, name: string, ids: string[]}], total: number, page: number, limit: number}`

- **POST `/api/tester`** - Add a tester to the database (their ID is automatically generated with a UUID) - requires admin:api permission
  - Request: `{name: string, ids: string[]|string}`
  - Response: `{success: boolean, uuid: string}`

- **POST `/api/tester/ids`** - Add an ID to the authenticated tester - requires admin:api permission
  - Request: `{name: string, id: string}`
  - Response: `{success: boolean, name: string, ids: [string]}`

- **GET `/api/tester`** - Get information about the authenticated tester - requires admin:api permission
  - Response: `{success: boolean, data: {uuid: string, name: string, ids: [string]}}`

### Purchase Management

- **POST `/api/purchase`** - Add a purchase to the database - requires write:api permission
  - Request: `{date: string, order: string, description: string, amount: number, screenshot: string}`
  - Response: `{success: boolean, id: string}`

- **GET `/api/purchase/:id`** - Get information about a specific purchase - requires read:api permission
  - Response: `{success: boolean, data: {id: string, date: string, order: string, description: string, amount: number, screenshot: string}}`

- **DELETE `/api/purchase/:purchaseId`** - Delete a purchase by ID - requires write:api permission
  - Response: `{success: boolean, message: string}`

- **GET `/api/purchase`** - Get a list of the authenticated tester's purchases - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`

- **GET `/api/purchases/not-refunded`** - Get a list of the authenticated tester's not-refunded purchases - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`

- **GET `/api/purchases/refunded`** - Get a list of the authenticated tester's refunded purchases - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`
  
- **GET `/api/purchase-status`** - Get the status of all purchases with feedback/publication/refund status - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc&limitToNotRefunded=false`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number, refunded: boolean, has_feedback: boolean, has_publication: boolean, has_refund: boolean}], total: number, page: number, limit: number}`
  
- **GET `/api/purchases/refunded-amount`** - Get total amount of refunded purchases - requires read:api permission
  - Response: `{success: boolean, amount: number}`

- **GET `/api/purchases/not-refunded-amount`** - Get total amount of non-refunded purchases - requires read:api permission
  - Response: `{success: boolean, amount: number}`

### Feedback Management

- **POST `/api/feedback`** - Add feedback to the database - requires write:api permission
  - Request: `{date: string, purchase: string, feedback: string}`
  - Response: `{success: boolean, id: string}`

- **GET `/api/feedback/:id`** - Get information about specific feedback - requires read:api permission
  - Response: `{success: boolean, data: {date: string, purchase: string, feedback: string}}`

- **POST `/api/publish`** - Record the publication of feedback - requires write:api permission
  - Request: `{date: string, purchase: string, screenshot: string}`
  - Response: `{success: boolean, id: string}`

- **GET `/api/publish/:id`** - Get information about a specific publication - requires read:api permission
  - Response: `{success: boolean, data: {date: string, purchase: string, screenshot: string}}`

### Refund Management

- **POST `/api/refund`** - Record a refund - requires write:api permission
  - Request: `{date: string, purchase: string, refundDate: string, amount: number, transactionId?: string}`
  - Response: `{success: boolean, id: string}`

- **GET `/api/refund/:id`** - Get information about a specific refund - requires read:api permission
  - Response: `{success: boolean, data: {date: string, purchase: string, refundDate: string, amount: number, transactionId?: string}}`

### Database Management

- **GET `/api/backup/json`** - Backup the database - requires backup:api permission
  - Response: `{success: boolean, data: {backup: string}}`

- **POST `/api/backup/json`** - Restore the database - requires backup:api permission
  - Request: `{backup: string}`
  - Response: `{success: boolean}`

### System Debug Endpoints

- **GET `/api/__d1/schema`** - Get database table names - requires admin:api permission
  - Response: `{tables: string[], timestamp: string}`

- **GET `/api/__d1/schema_version`** - Get database schema version - requires admin:api permission
  - Response: `{version: {version: number, description: string}, timestamp: string}`

- **GET `/api/__d1/schema_migrations`** - Execute database schema migrations - requires admin:api permission
  - Response: `{migrations: string[], timestamp: string}`

## Development

The application is developed using React 19, Vite, and Tailwind CSS. The backend is developed using Cloudflare Workers and the [Cloudflare D1](https://developers.cloudflare.com/d1/worker-api/) database.

The repository is structured as a monorepo with the following structure:

Clone the repository and install the dependencies:

```bash
git clone https://github.com/sctg-development/feedback-flow.git
cd feedback-flow/cloudflare-worker
npm ci
cd ../client
npm ci
```

### Configure Auth0

See the [Auth0.md](https://github.com/sctg-development/feedback-flow/blob/main/Auth0.md) file for detailed instructions on how to configure Auth0 for the application.

### Environment Variables

The application requires the following environment variables to be set in a `.env` file in the root of the repository:

```bash
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_DOMAIN=your_auth0_domain
AUTH0_SCOPE="openid profile email read:api write:api admin:api backup:api"
AUTH0_AUDIENCE="http://localhost:8787/api"
AUTH0_SUB=your_current_user_token_sub
API_BASE_URL=http://localhost:8787/api
CORS_ORIGIN=http://localhost:5173
READ_PERMISSION=read:api
WRITE_PERMISSION=write:api
ADMIN_PERMISSION=admin:api
BACKUP_PERMISSION=backup:api
CRYPTOKEN=any_random_string_to_encrypt_the_variables_in_the_repo
AMAZON_BASE_URL="https://www.amazon.fr/gp/your-account/order-details?orderID="
DB_BACKEND=memory # or d1
DB_MAX_IMAGE_SIZE=640
AUTH0_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXRodWJ8MTIzNDU2Nzg5MCIsIm5hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMiwicGVybWlzc2lvbnMiOiJyZWFkOmFwaSB3cml0ZTphcGkgYWRtaW46YXBpIGJhY2t1cDphcGkifQ.m1URdlBbuHa9_e3xN2MEMnkGm3ISbVBAuW7fWgL7fms"
```

### Run the Application

To run the application, you need to start both the client and the server.
In the root of the repository, run the following command:

1. Start the development server backend:

   ```bash
   cd cloudflare-worker && npm run dev:env
   ```

2. Start the development server frontend in another terminal:

   ```bash
   cd client && npm run dev:env
   ```

3. The application should now be running at [http://localhost:5173](http://localhost:5173) and the API at [http://localhost:8787](http://localhost:8787).
4. Connect to the application with your browser to [http://localhost:5173](http://localhost:5173).

5. Log in to the application with your GitHub account. Copy the token from the application, you can find it by clicking on your name in the appliation footer.
6. Copy the token and paste it in the `AUTH0_TOKEN` variable in the `.env` file.
7. Restart the Cloudflare Worker.
8. in the `cloudflare-worker` folder, run the following command test the worker and add some data to the **TESTER** user linked to your GitHub account:

   ```bash
   cd cloudflare-worker
   npm test
   ```

## Screenshots

Main page  
<img width="1275" alt="main" src="https://github.com/user-attachments/assets/190dc406-27da-473d-bc2f-3c2e555661f7" />

Main page (user with read-only permissions)
![image](https://github.com/user-attachments/assets/551489d2-750e-4ba5-b8c8-2656b2a7aa39)



Add a purchase  
<img width="572" alt="new" src="https://github.com/user-attachments/assets/bd285ec9-6d40-4c60-abe2-218b440c1e4c" />

Add a feedback  
<img width="595" alt="feed" src="https://github.com/user-attachments/assets/f7b7719d-1c81-43e6-bec2-74cea15d6424" />

Publish feedback  
<img width="477" alt="publish-feedback" src="https://github.com/user-attachments/assets/c128ad7c-48fe-4d7d-9866-82b5a376c293" />  

Generate a PDF report for purchases ready to refund
<img width="1379" alt="sreen" src="https://github.com/user-attachments/assets/e2ee801a-fb9b-43db-85ab-f531944ac863" />

Add a refund  
<img width="462" alt="refund" src="https://github.com/user-attachments/assets/b91764a4-121a-4d43-b924-35c5b2e88a27" />  

Add a new user (Admin menu, dark mode)  
<img width="1043" alt="add-user" src="https://github.com/user-attachments/assets/bded224e-e8eb-494d-bd06-cdf4754a62e7" />  

API  
<img width="1124" alt="image" src="https://github.com/user-attachments/assets/cb2d57f5-d18c-481b-ba22-ee3455fbb044" />
````

