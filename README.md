![](https://tokei.rs/b1/github/sctg-development/feedback-flow?type=SQL,TypeScript,TSX,C&category=code)
![](https://tokei.rs/b1/github/sctg-development/feedback-flow?type=TSX,SQL,TypeScript&category=comments)  
# Feedback Flow Application

Feedback Flow is an application designed to help product testers manage their testing activities and feedback.

This application is specifically built for individuals who participate in product testing programs (such as "Amazon's Testers Club"), where sellers offer free or discounted products in exchange for honest reviews. The management of the products offered by sellers is outside the scope of this application.

## Star the project

**If you find this tool useful, please consider giving it a star! 🤩**

## Who is this for?

This application is designed for:

- Product testers who regularly participate in testing programs
- Individuals who need to track multiple product testing assignments
- Users who want to maintain organized records of their purchases, feedback, and refunds
- Testers who need to provide evidence of completed reviews to receive refunds

The application is not intended for sellers or product managers. It is specifically tailored for testers who need to manage their testing activities and provide proof of their work.

The application allows testers to:

- Track their product purchases
- Document their feedback
- Provide proof of published reviews
- Monitor refund status

In case of any dispute with a seller, the tester can use this application to prove they have purchased the product, provided their opinion, and that this opinion has been published on the required platform.

## Template

The application is based on the [Vite, Auth0 & HeroUI Template](https://github.com/sctg-development/vite-react-heroui-auth0-template), which is a starter template for a React 19 application with Auth0 and HeroUI 2.7, along with a backend running on a Worker C.

## Hardware Architecture

The application is deployed on a CDN as a static SPA (Single Page Application). It communicates with a REST API deployed on a free Cloudflare worker.

## Data Analysis

- A product tester is someone who tests a product and provides feedback on it.
- A product is an item or service that is tested by a tester.
- The seller is the person who sells the product.
- Feedback is the opinion given by the tester about the product.
<img width="1260" alt="Statistics dashboard screenshots" src="https://github.com/user-attachments/assets/f222c477-59ec-419d-987a-0a3276aa7412" />

## Testing and Feedback Process

The standard product testing process managed by this application is:

1. A seller offers a product to a tester (usually at a discount or for free)
2. The tester purchases the product
3. The tester provides the seller with a screenshot as proof of purchase
4. The tester tests the product
5. The tester writes and submits their honest opinion on the product
6. The feedback is published on the specified platform (e.g., Amazon)
7. The tester provides the seller with a screenshot of the published feedback
8. The seller refunds the tester (fully or partially)

There may be a delay between the purchase and the refund. Additionally, the refund amount may differ from the purchase amount, which is why the application tracks both values separately.

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
| auth0:admin:api  | Administer Auth0 users |
| read:api  | Read one's own feedback data |
| write:api  | Write one's own feedback data |
| search:api | Search for feedback data |
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
- Search purchases (search:api)
- Generate short public links for dispute resolution (write:api)
- Access dispute resolution information via public links (no permission required)

## Users & Permissions page (Admin)

This project includes a full admin "Users & Permissions" page implemented at `client/src/pages/users-and-permissions.tsx`. The page lets administrators manage application users (Auth0 users) and map their OAuth IDs to internal "Tester" records for tracking purchases, feedback, and refunds.

Key features
- Display Auth0 users with a derived "Tester" column (if the user is already assigned to a tester).
- Create a new `Tester` entity and attach one or more OAuth IDs to it via a `Create Tester` modal.
- Assign a single or multiple Auth0 user IDs to an existing `Tester` with an `Assign Tester` modal.
- Bulk operations: select multiple users and assign/unassign them in bulk.
- Unassign single IDs or bulk unassign selected IDs.
- Delete an Auth0 user — this attempts to unassign the user's OAuth ID from any `Tester` before removing the user.

How it works (overview)
- The page fetches a management token to call Auth0 Management endpoints and lists Auth0 users.
- To determine which users are mapped to Testers, the client calls `POST /api/testers` with an `ids` array (OAuth IDs). The backend returns a list of `Testers` that include any matching `id` in their `ids` array.
- The client builds a `testerMap` mapping each OAuth id to its corresponding `Tester`. The map contains both provider|id and bare id (for robust lookups), e.g. `github|1234` and `1234`.
- The table shows a `Tester` column; when the user is assigned to one, the name appears with `unassign` button. When not assigned, an `assign` button is shown.

API endpoints used by the page
- POST `/api/testers` — Query for `Tester` entities that match a list of OAuth `ids`. Used to build `testerMap` displayed in the UI. Request body example:
```json
{ "ids": ["github|123456", "auth0|abcdef"] }
```
- POST `/api/tester` — Create a new `Tester` with name and `ids` array. Example:
```json
{ "name": "TESTER", "ids": ["github|123456"] }
```
- POST `/api/tester/ids` — Add one or many IDs to an existing `Tester` (by `uuid` or `name`). Example:
```json
{ "uuid": "tester-uuid", "ids": ["github|123456", "auth0|abcdef"] }
```
- DELETE `/api/tester/ids` — Remove an ID from a `Tester` by `uuid` or `name`:
```json
{ "uuid": "tester-uuid", "id": "github|123456" }
```

Permissions & security
- All Tester management endpoints require an admin permission. By default the app uses `ADMIN_PERMISSION` to gate these endpoints.
- The UI obtains an Auth0 management token and uses it to list and manage Auth0 users while calls to the API are protected by `Authorization: Bearer <JWT>`.

UX specifics
- Create and Assign flows are modal-driven, and the page uses HeroUI toasts for feedback on success/failure.
- When assigning, the UI checks whether the user is already assigned to a tester and prevents opening the "Assign" modal in that case.
- The UX supports both single and bulk assignments for convenience.

Edge cases & behaviors
- The server supports several ID formats: `provider|id` and `id` (bare). The client maps both to increase match robustness.
- When adding IDs server-side, the API verifies if an ID is already present in the database and will return `409` on conflicts. The client shows appropriate toasts based on the response.
- Deleting an Auth0 user first attempts to unassign the user from any `Tester` to keep the mapping consistent.

Notes for developers
- If you change the API handling of IDs (for example, if you add a stronger normalization step for `id` vs `provider|id`), make sure to update both the client mapping logic (`users-and-permissions.tsx`) and the D1 repository logic (`cloudflare-worker/src/db/d1-db.ts`) that inserts/queries `id_mappings`.
- The code uses a `postJsonRef` pattern to avoid stale closures that would otherwise trigger infinite re-renders when the `postJson` hook changes.
- Tests exist in `cloudflare-worker/test/*` to run end-to-end checks for the `tester` endpoints; ensure you keep tests aligned with the API semantics (e.g., expecting `409` for duplicate ids).

## Security

Authentication is handled by Auth0. The system is provided by the template. It is an OAuth 2.0 process that runs in the browser. The browser receives a JWT token, which it sends to the API. The API verifies the token and grants or denies access to the resource based on the permissions included in the token.

## Test Data Generation

To quickly populate your development environment with sample data, you can use the automated test data generation feature. This creates realistic test data including purchases, feedback, and refunds linked to your GitHub account.

### Quick Setup

Run the following command in the `cloudflare-worker` directory:

```bash
npm run d1:create && npm run d1:init && npm test
```

This command sequence will:
1. **Create** the D1 database structure
2. **Initialize** the database with required tables and schema
3. **Run tests** that populate the database with sample data for your user

### Authentication Setup

Before generating test data, you need to link your GitHub account to the application:

1. **Log in** to the application using your GitHub account at [http://localhost:5173](http://localhost:5173)
2. **Copy your Auth0 token**:
   - Click on your name in the application footer
   - Copy the JWT token that appears in the modal
3. **Get your GitHub user ID**:
   - Hover over your name in the footer to see your user ID in a tooltip
   - Note this ID for the `.env` configuration
4. **Update your `.env` file** with the copied token and user ID
5. **Restart the Cloudflare Worker** to apply the new configuration
6. **Run the test command** to generate sample data

### Environment Configuration

Create a `.env` file in the root of the repository with the following structure:

```bash
# Auth0 Configuration (replace with your actual values)
AUTH0_CLIENT_ID=your_actual_client_id_here
AUTH0_CLIENT_SECRET=your_actual_client_secret_here
AUTH0_MANAGEMENT_API_CLIENT_ID=your_actual_management_api_client_id_here
AUTH0_MANAGEMENT_API_CLIENT_SECRET=your_actual_management_api_client_secret_here
AUTH0_DOMAIN=your-domain.eu.auth0.com
AUTH0_SCOPE="openid profile email read:api write:api admin:api backup:api"
AUTH0_AUDIENCE="http://localhost:8787/api"
AUTH0_SUB="github|123456789" # Replace with your actual GitHub user ID

# API Configuration
API_BASE_URL=http://localhost:8787/api
CORS_ORIGIN=http://localhost:5173

# Permissions
READ_PERMISSION=read:api
WRITE_PERMISSION=write:api
ADMIN_PERMISSION=admin:api
ADMIN_AUTH0_PERMISSION=auth0:admin:api
BACKUP_PERMISSION=backup:api
SEARCH_PERMISSION=search:api

# Application Settings
CRYPTOKEN="your_random_encryption_key_here"
STATISTICS_LIMIT=100
DB_BACKEND=d1
DB_MAX_IMAGE_SIZE=640
AMAZON_BASE_URL="https://www.amazon.fr/gp/your-account/order-details?orderID="

# Authentication Token (copy from application after login)
AUTH0_TOKEN="your_jwt_token_copied_from_application"
```

### What Test Data is Created

The test suite generates:
- **Sample purchases** with various dates, amounts, and order numbers
- **Feedback entries** linked to purchases
- **Publication records** with mock screenshots
- **Refund transactions** to demonstrate the complete workflow
- **Different purchase states** (pending, with feedback, published, refunded)

This data allows you to immediately test all application features without manually creating entries.

## REST API

A Swagger ui is automatically generated for the API. It is available at [/docs](https://sctg-development.github.io/feedback-flow/docs). The API is secured with Auth0. The API uses the same authentication process as the application. The API requires a JWT token to be sent in the `Authorization` header of each request. The token must be prefixed with `Bearer`.  
For easily adding the token, simply click on your name in the footer of the application. A modal will open with the token. Copy the token with the supplied button and paste it in the `Authorization` field in Swagger. The token is valid for 24 hours. The API uses the same permissions as the application. The API uses the same database as the application.  


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

## Cloudflare deployment (free account, KV, D1)

Follow these recommended steps to prepare and deploy the API on Cloudflare (free account): create the KV namespace, create and initialize the D1 database, then deploy using the GitHub Actions workflow `CloudflareWorkerDeploy`:

1. Create a free Cloudflare account
   - Visit https://dash.cloudflare.com/ and sign up for a free account.
   - Enable the “Workers” feature in your Cloudflare account if it is not enabled already.

2. Install Wrangler and sign in
   - Install Wrangler:
     ```bash
     npm install -g wrangler
     # or locally in the cloudflare-worker folder: npx wrangler
     ```
   - Sign in to Cloudflare from Wrangler for CLI actions:
     ```bash
     npx wrangler login
     ```

3. Create a KV Namespace (binding: `KV_CACHE`)
   - Via the Dashboard: Workers -> Tools -> KV -> Create namespace. Copy the namespace ID.
   - Or via the Wrangler CLI:
     ```bash
     npx wrangler kv:namespace create "KV_CACHE"
     ```
   - Add the returned namespace ID to `wrangler.jsonc` under `kv_namespaces` or adapt your environment configuration.

4. Create a D1 database (binding: `FeedbackFlowDB`)
   - In the Cloudflare Dashboard: D1 -> Create database and name it `feedbackflow-db`.
   - Or via the Wrangler CLI (if available):
     ```bash
     npx wrangler d1 create feedbackflow-db
     ```
   - Copy the returned database ID and add it to the `d1_databases` section in `wrangler.jsonc` if it is not added automatically.

5. Configure GitHub secrets and environment variables
   - In your GitHub repository -> Settings -> Secrets and variables -> Actions, add the following secrets and variables:
     - `CLOUDFLARE_API_TOKEN` (token with minimal rights to edit Workers, D1 and KV)
     - `CLOUDFLARE_ACCOUNT_ID` (your Cloudflare account ID)
     - `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_MANAGEMENT_API_CLIENT_ID`, `AUTH0_MANAGEMENT_API_CLIENT_SECRET` (for Auth0 integration)
     - `API_BASE_URL`, `CORS_ORIGIN` and other `AUTH0_*` variables as needed (see the `.env` example above)
   - The `CloudflareWorkerDeploy` workflow will use these secrets to populate `wrangler.jsonc` and perform the deployment.

**For forks: enable Actions and create secrets/vars in your fork**

If you fork this repository and want to deploy from your fork, follow these steps:

- Fork the repository to your account.
- Go to the forked repository -> Settings -> Actions -> General and ensure GitHub Actions is enabled (choose “Allow all actions and reusable workflows” if needed).
- In the forked repository, open Settings -> Actions -> Secrets and variables -> Actions and create the secrets and variables listed below. The workflow uses a combination of repository *secrets* (for sensitive values) and *variables* (non-sensitive settings) as defined in `.github/workflows/deploy-cloudflare-worker.yaml`.

The workflow expects the following GitHub *secrets* (mark as **Secret**):

- CLOUDFLARE_API_TOKEN (token with minimal rights to edit Workers, D1 and KV)
- CLOUDFLARE_ACCOUNT_ID (Cloudflare account ID)
- AUTH0_DOMAIN
- AUTH0_CLIENT_ID
- AUTH0_CLIENT_SECRET
- AUTH0_MANAGEMENT_API_CLIENT_ID
- AUTH0_MANAGEMENT_API_CLIENT_SECRET
- AUTH0_AUDIENCE
- API_BASE_URL
- CORS_ORIGIN
- PAYPAL_TRANSACTION_BASE_URL

The following keys are typically created as **repository variables** (not secret), since they hold configuration values used by the workflow. You can still use secrets if you prefer:

- AUTH0_SCOPE
- READ_PERMISSION
- WRITE_PERMISSION
- ADMIN_PERMISSION
- SEARCH_PERMISSION
- ADMIN_AUTH0_PERMISSION
- DB_BACKEND (e.g., d1)
- BACKUP_PERMISSION
- DB_MAX_IMAGE_SIZE
- AMAZON_BASE_URL
- STATISTICS_LIMIT

Notes about secrets & vars:

- `AUTH0_*` and `PAYPAL_TRANSACTION_BASE_URL` contain sensitive values and should be stored as **secrets** not **variables**.
- `CLOUDFLARE_API_TOKEN` needs minimal polices: Workers Scripts: Edit, Workers KV Namespace: Edit, D1: Edit (or equivalent). Ensure you scope permissions tightly in production.
- After creating these values, you can trigger the workflow with a `git push` on `main` or from the Actions UI in your fork.

6. Initialize the D1 database with our remote script
   - Ensure you have installed dependencies and are in the `cloudflare-worker` directory:
     ```bash
     cd cloudflare-worker
     npm ci
     ```
   - Run the remote initialization (create tables):
     ```bash
     npm run d1:create:remote
     ```
   - To run migrations (if present):
     ```bash
     npm run d1:migrate:all:remote
     ```

7. Deploy via GitHub Actions
   - The workflow used is `.github/workflows/deploy-cloudflare-worker.yaml` (workflow name: `CloudflareWorkerDeploy`).
   - Once secrets are configured (step 5), you can either:
     - Push a commit to the `main` branch (this triggers CI), or
     - Manually run the workflow in the Actions tab -> CloudflareWorkerDeploy -> Run workflow.

8. Verification
   - After deployment, check the Worker public URL (configured via `API_BASE_URL`/domains) and test your endpoints (e.g. `GET /api/testers`).
   - For local debugging, use `npx wrangler dev`.

Notes
 - Ensure `CLOUDFLARE_API_TOKEN` is created with the minimal required permissions: Workers Scripts: Edit, Workers KV Namespace: Edit, D1: Edit.
 - If you use the CLI to create resources (KV/D1), save the IDs returned and add them to `wrangler.jsonc` or the appropriate secrets.
 - For production, treat secrets and API tokens carefully and review permission scopes regularly.


### Configure Auth0

See the [Auth0.md](https://github.com/sctg-development/feedback-flow/blob/main/Auth0.md) file for detailed instructions on how to configure Auth0 for the application.

### Environment Variables

The application requires the following environment variables to be set in a `.env` file in the root of the repository:

```bash
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_MANAGEMENT_API_CLIENT_ID=your_auth0_management_api_client_id
AUTH0_MANAGEMENT_API_CLIENT_SECRET=your_auth0_management_api_client_secret
AUTH0_DOMAIN=your_auth0_domain
AUTH0_SCOPE="openid profile email read:api write:api admin:api backup:api"
AUTH0_AUDIENCE="http://localhost:8787/api"
AUTH0_SUB=your_current_user_token_sub
API_BASE_URL=http://localhost:8787/api
CORS_ORIGIN=http://localhost:5173
READ_PERMISSION=read:api
WRITE_PERMISSION=write:api
ADMIN_PERMISSION=admin:api
ADMIN_AUTH0_PERMISSION=auth0:admin:api
BACKUP_PERMISSION=backup:api
CRYPTOKEN=any_random_string_to_encrypt_the_variables_in_the_repo
AMAZON_BASE_URL="https://www.amazon.fr/gp/your-account/order-details?orderID="
DB_BACKEND=memory # or d1
DB_MAX_IMAGE_SIZE=640
# This is the token you get from the application when you log in. It is used to authenticate the user with the API.
# It is not required to be set in the .env file, but it is used in the tests to authenticate the user.
AUTH0_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnaXRodWJ8MTIzNDU2Nzg5MCIsIm5hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMiwicGVybWlzc2lvbnMiOiJyZWFkOmFwaSB3cml0ZTphcGkgYWRtaW46YXBpIGJhY2t1cDphcGkifQ.m1URdlBbuHa9_e3xN2MEMnkGm3ISbVBAuW7fWgL7fms"
STATISTICS_LIMIT=100 # number of purchases to uses in the statistics
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

`````

