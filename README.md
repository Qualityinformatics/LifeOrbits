# LifeOrbits

LifeOrbits is a static single-page web app designed for Azure Static Web Apps.

## Project Files

- `index.html`: app entrypoint for deployment
- `life-orbits.html`: original source snapshot
- `staticwebapp.config.json`: routing and security header config for Azure Static Web Apps
- `.github/workflows/azure-static-web-apps-lifeorbits.yml`: CI/CD workflow template

## Deploy To Azure Static Web Apps

1. Push this repository to GitHub.
2. In Azure Portal, create a new **Static Web App**.
3. Choose your subscription/resource group and set:
   - Name: `LifeOrbits`
   - Deployment source: `GitHub`
   - Organization/repository/branch: your repo + `main`
4. Build details:
   - Build Presets: `Custom`
   - App location: `/`
   - Api location: (leave blank)
   - Output location: (leave blank)
5. Create the resource.

Azure usually generates its own workflow and token secret automatically. If it does, prefer Azure's generated workflow.

## If You Use The Included Workflow Template

1. In Azure Static Web App, open **Manage deployment token** and copy the token.
2. In GitHub repo settings, add a repository secret named:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_LIFEORBITS`
3. Commit and push to `main`.

## Local Preview

Open `index.html` directly in a browser.

Optional local server:

```powershell
python -m http.server 5500
```

Then open `http://localhost:5500`.
