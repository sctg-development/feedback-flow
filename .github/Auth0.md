# Setting Up Auth0 for "Feedback Flow"

This guide will walk you through creating and configuring an Auth0 account for the Feedback Flow application. Whether you're new to Auth0 or OAuth2, this step-by-step tutorial will help you get everything set up correctly.

## What is Auth0?

Auth0 is a flexible, secure authentication and authorization platform that:

- Manages user logins, registrations, and account security
- Supports social logins (like GitHub, Google) alongside traditional email/password
- Provides permissions and role-based access controls
- Handles complex security concerns so you don't have to

The Feedback Flow application uses Auth0 to secure both its frontend and API.

## Step 1: Create a Free Auth0 Account

1. Visit [Auth0's website](https://auth0.com/)
2. Click on the **Sign Up** button
3. You can create an account using your email or via a social provider (GitHub is recommended)
4. Complete the registration process and verify your email if needed

![Auth0 Signup Page](https://auth0.com/docs/media/articles/get-started/auth0-overview/create-account.png)

## Step 2: Create a "Feedback Flow" Application

1. After logging in, you'll see the Auth0 dashboard
2. Navigate to **Applications** in the left sidebar
3. Click **Create Application**
4. Enter "Feedback Flow" as the name
5. Select **Single Page Application (SPA)** as the application type
6. Click **Create**

![Create Application](https://auth0.com/docs/media/articles/dashboard/applications/applications-list.png)

### Configure Application Settings

1. Go to the **Settings** tab of your newly created application
2. Find the following fields and update them:

   **Allowed Callback URLs**:

        `http://localhost:5173,https://your-deployment-url.com`
   **Allowed Logout URLs**:

        `http://localhost:5173,https://your-deployment-url.com`
   **Allowed Web Origins (CORS)**:

        `http://localhost:5173,https://your-deployment-url.com`

3. Scroll down and click **Save Changes**

> **Important**: Make note of your **Domain**, **Client ID**, and **Client Secret** from this page - you'll need them for your environment variables later.

## Step 3: Set Up GitHub Social Connection

Social connections allow users to log in with their existing GitHub accounts instead of creating new credentials.

1. In the Auth0 dashboard sidebar, go to **Authentication > Social**
2. Find **GitHub** in the list and click on it
3. Click **Continue** to set it up

### Creating a GitHub OAuth App

1. Open a new tab and go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on **New OAuth App**
3. Fill in the details:

- **Application Name**: Feedback Flow
- **Homepage URL**: Your application URL or localhost URL during development
- **Authorization callback URL**: Copy this from the Auth0 GitHub connection screen

4. Click **Register Application**
5. Generate a new client secret
6. Copy the **Client ID** and **Client Secret**

### Complete the Connection

1. Return to the Auth0 GitHub connection page
2. Paste the GitHub Client ID and Client Secret into the Auth0 fields
3. Toggle on **Enable GitHub Connection**
4. Under **Applications**, enable the toggle for your Feedback Flow application
5. Click **Save**

## Step 4: Test the Social Connection

Before proceeding, verify your GitHub connection works:

1. In the Auth0 GitHub connection page, click **Try Connection**
2. You should be redirected to GitHub for authorization
3. After authorizing, you should be redirected back with a success message
4. If it fails, double-check your GitHub OAuth configuration

## Step 5: Create API Configurations

For Feedback Flow to work properly, you need to create two API configurations in Auth0:

### Production API

1. Go to **Applications > APIs** in the Auth0 dashboard
2. Click **Create API**
3. Fill in the form:

- **Name**: Feedback Flow API
- **Identifier (Audience)**: `https://your-deployment-url.com/api`
- **Signing Algorithm**: RS256 (default)

4. Click **Create**
5. Go to the **Permissions** tab
6. Add the following permissions:

- `read:api` - Read access to API resources
- `write:api` - Write access to API resources
- `admin:api` - Administrative access to API
- `backup:api` - Access to backup/restore functionality

7. Under **Settings**, enable **Add Permissions in the Access Token**
8. Save changes

### Development API

1. Repeat the process above with these differences:

- **Name**: Feedback Flow Test API
- **Identifier (Audience)**: `http://localhost:8787/api`

2. Add the same permissions and settings as the Production API

## Step 6: Create Roles for Access Control

Roles simplify permission management by grouping permissions together:

1. Go to **User Management > Roles** in the Auth0 dashboard
2. Click **Create Role**
3. Create three separate roles:

**feedback-flow-admin**:

- Add the permissions: `read:api`, `write:api`, `admin:api`

**feedback-flow-backup**:

- Add the permission: `backup:api`

**feedback-flow-user**:

- Add the permissions: `read:api`, `write:api`

## Step 7: Assign Roles to Your User

1. Go to **User Management > Users**
2. Find and click on your GitHub user
3. Navigate to the **Roles** tab
4. Click **Assign Roles**
5. Select all three roles you created
6. Click **Assign**

## Step 8: Update Your Environment Variables

Now that Auth0 is configured, update the `.env` file in your project root:

```bash
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_DOMAIN=your_auth0_domain
AUTH0_SCOPE="openid profile email read:api write:api admin:api backup:api"
AUTH0_AUDIENCE="http://localhost:8787/api"  # For development
# AUTH0_AUDIENCE="https://your-deployment-url.com/api"  # For production
API_BASE_URL=http://localhost:8787/api  # For development
# API_BASE_URL=https://your-deployment-url.com/api  # For production
CORS_ORIGIN=http://localhost:5173  # For development
# CORS_ORIGIN=https://your-deployment-url.com  # For production
READ_PERMISSION=read:api
WRITE_PERMISSION=write:api
ADMIN_PERMISSION=admin:api
BACKUP_PERMISSION=backup:api
```

## Troubleshooting Common Issues

### Token Issues

Problem: "Invalid audience in token"
Solution: Ensure your AUTH0_AUDIENCE matches exactly what you configured in Auth0

### Login Problems

Problem: "Login redirects but immediately goes back to login screen"
Solution: Verify your callback URLs are correctly configured

### Permission Denied

Problem: "Insufficient permissions" errors
Solution: Check that your user has the right roles assigned and permissions are added to the token

## Next Steps

Once Auth0 is configured:

1. Start the development server backend:

   ```bash
   cd apps/cloudflare-worker && yarn dev:env
   ```

2. Start the development server frontend iin another terminal:

   ```bash
   cd apps/client && yarn dev
   ```

3. The login should now work with your GitHub account
4. You should have access to all features based on your assigned roles
