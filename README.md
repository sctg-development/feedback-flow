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
<img width="1260" alt="Capture d’écran 2025-05-05 à 19 15 36" src="https://github.com/user-attachments/assets/f222c477-59ec-419d-987a-0a3276aa7412" />

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

- **POST `/api/purchase`** - Add a new purchase to the database - requires write:api permission
  - Request: `{date: string, order: string, description: string, amount: number, screenshot: string}`
  - Response: `{success: boolean, id: string}`

- **GET `/api/purchase/:id`** - Get information about a specific purchase - requires read:api permission
  - Response: `{success: boolean, data: {id: string, date: string, order: string, description: string, amount: number, screenshot: string}}`

- **POST `/api/purchase/:id`** - Update an existing purchase - requires write:api permission
  - Request: `{date?: string, order?: string, description?: string, amount?: number, screenshot?: string, screenshotSummary?: string}`
  - Response: `{success: boolean, message: string}`

- **DELETE `/api/purchase/:purchaseId`** - Delete a purchase by ID - requires write:api permission
  - Response: `{success: boolean, message: string}`

- **GET `/api/purchases/not-refunded`** - Get a list of the authenticated tester's non-refunded purchases - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`

- **GET `/api/purchases/refunded`** - Get a list of the authenticated tester's refunded purchases - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number}], total: number, page: number, limit: number}`

- **GET `/api/purchases/ready-to-refund`** - Get a list of purchases ready for refund (with feedback and publication) - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc`
  - Response: `{success: boolean, data: [{id: string, date: string, order: string, description: string, amount: number, feedback: string, feedbackDate: string, publicationDate: string, publicationScreenshot: string}], total: number, page: number, limit: number}`
  
- **GET `/api/purchase-status`** - Get the status of all purchases with feedback/publication/refund status - requires read:api permission
  - Optional parameters: `?page=1&limit=10&sort=date&order=desc&limitToNotRefunded=true`
  - Response: `{success: boolean, data: [{purchase: string, date: string, order: string, description: string, amount: number, refunded: boolean, hasFeedback: boolean, hasPublication: boolean, hasRefund: boolean, transactionId?: string}], total: number, page: number, limit: number}`

- **POST `/api/purchase-status-batch`** - Get purchase status for a list of purchase IDs - requires read:api permission
  - Request: `{purchaseIds: string[], page?: number, limit?: number, sort?: string, order?: string}`
  - Response: `{success: boolean, data: [{purchase: string, date: string, order: string, description: string, amount: number, refunded: boolean, hasFeedback: boolean, hasPublication: boolean, hasRefund: boolean, transactionId?: string}], pageInfo: {currentPage: number, totalPages: number, totalCount: number, hasNextPage: boolean, hasPreviousPage: boolean}}`

- **POST `/api/purchase/search`** - Search purchases using fuzzy matching - requires read:api permission
  - Searches for purchases matching the query using fuzzy matching
  - Supports case-insensitive search, accent-insensitive search, and partial matches
  - Searches in purchase ID, order number, description, and amount
  - Minimum query length: 4 characters
  - Request: `{query: string, limit?: number}`
  - Response: `{success: boolean, data: string[]}` (array of matching purchase IDs)
  
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

### Statistics

- **GET `/api/stats/refund-balance`** - Get balance between purchases and refunds - requires read:api permission
  - Response: `{success: boolean, purchasedAmount: number, refundedAmount: number, balance: number}`

- **GET `/api/stats/refund-delay`** - Get statistics about refund delays - requires read:api permission
  - Response: `{success: boolean, data: [{purchaseId: string, purchaseAmount: number, refundAmount: number, delayInDays: number, purchaseDate: string, refundDate: string}], averageDelayInDays: number}`

- **GET `/api/stats/purchases`** - Get purchase statistics overview - requires read:api permission
  - Response: `{success: boolean, data: {totalPurchases: number, totalRefundedPurchases: number, totalRefundedAmount: number}}`

### Public Short Links for Dispute Resolution

These endpoints enable testers to generate secure short links for sharing dispute resolution information publicly. This is useful for cases where proof of purchase, feedback, and publication needs to be shared with a third party or dispute resolution authority.

#### Link Generation

- **POST `/api/link/public`** - Generate a short public link for dispute resolution - requires write:api permission
  - Query parameters:
    - `duration` (required): Duration in seconds for which the link should be valid (minimum 60, maximum 31536000 / 1 year)
    - `purchase` (required): The UUID of the purchase to create a link for
  - The purchase must have both feedback and publication before a link can be created
  - Link codes are 7 characters long, containing digits (0-9) and letters (a-z, A-Z)
  - Each generated code is unique and automatically checked for collisions
  - Request: `POST /api/link/public?duration=3600&purchase=550e8400-e29b-41d4-a716-446655440000`
  - Response: `{success: boolean, code: string, url: string}`
  - Example Response: `{success: true, code: "aBc1234", url: "/link/aBc1234"}`

#### Link Data Retrieval

- **GET `/api/link/:code`** - Access public dispute resolution information via short link - no permission required (public endpoint)
  - Path parameter: `code` - The 7-character unique link code
  - This endpoint returns the complete dispute resolution information if the link is valid (not expired and properly formatted)
  - Returns the following data for eligible purchases:
    - Order details: order number, date, amount, purchase screenshot
    - Feedback details: submission date, feedback text
    - Publication details: publication date, publication screenshot
    - Refund details (if applicable): refund amount, transaction ID
  - Response: `{success: boolean, data: {orderNumber: string, orderDate: string, purchaseAmount: number, purchaseScreenshot: string, feedbackDate: string, feedbackText: string, publicationDate: string, publicationScreenshot: string, isRefunded: boolean, refundAmount?: number, refundTransactionId?: string}}`
  - Error responses:
    - `400`: Invalid link code format (must be exactly 7 alphanumeric characters)
    - `404`: Link not found or has expired

#### Usage Example

1. Generate a short link for dispute resolution:
   ```bash
   POST /api/link/public?duration=2592000&purchase=550e8400-e29b-41d4-a716-446655440000
   # Response: {"success": true, "code": "xY7zQw", "url": "/link/xY7zQw"}
   ```

2. Share the link publicly (e.g., `https://example.com/link/xY7zQw`) or with dispute resolution services

3. Access the dispute information using the link code:
   ```bash
   GET /link/xY7zQw
   # Returns complete dispute resolution data including purchase proof, feedback, and publication proof
   ```
<img width="1091" height="1024" alt="Capture d’écran 2025-10-30 à 10 18 24" src="https://github.com/user-attachments/assets/862a3aae-bc35-4409-afee-f62d3cf25314" />

#### Technical Details

- Link expiration is checked at retrieval time, not during link generation
- The link will only return data if the purchase has both feedback and a publication entry
- No authentication is required to retrieve data via a valid link code
- Link codes use 62 possible characters per position (10 digits + 26 lowercase + 26 uppercase), providing 62^7 ≈ 3.5 trillion possible combinations
- The database includes an index on the `(code, expires_at)` composite key for efficient expiration checks
- Link cleanup can be performed using the DELETE endpoint or by calling the repository's `cleanupExpired()` method

#### Link Maintenance

- **DELETE `/api/links/expired`** - Delete all expired short links - requires admin:api permission
  - This endpoint removes all links that have passed their expiration time
  - Useful for regular database maintenance and cleanup
  - Response: `{success: boolean, deletedCount: number}`
  - Example Response: `{success: true, deletedCount: 5}`

### Database Management

- **GET `/api/backup/json`** - Backup the database to JSON format - requires backup:api permission
  - Response: `{success: boolean, data: {testers: any[], purchases: any[], feedbacks: any[], publications: any[], refunds: any[], ids: any[]}}`

- **POST `/api/backup/json`** - Restore the database from JSON format - requires backup:api permission
  - Request: `{backup: string}` (stringified JSON from backup)
  - Response: `{success: boolean, message: string}`

### System Debug Endpoints (Cloudflare D1 only)

- **GET `/api/__d1/schema`** - Get database table names - requires admin:api permission
  - Response: `{success: boolean, tables: string[], timestamp: string}`

- **GET `/api/__d1/schema_version`** - Get current database schema version - requires admin:api permission
  - Response: `{success: boolean, version: {version: number, description: string}, timestamp: string}`

- **GET `/api/__d1/schema_migrations`** - Execute database schema migrations - requires admin:api permission
  - Response: `{success: boolean, migrations: string[], timestamp: string}`

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

