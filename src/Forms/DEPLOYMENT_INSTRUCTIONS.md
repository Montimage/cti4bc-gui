# Deployment Instructions for New Google Forms Import Mechanism

## 1. Google Apps Script Deployment (code.gs)

### Steps in Google Apps Script:

1. Open [Google Apps Script](https://script.google.com/)
2. Create a new project or open the existing project containing `code.gs`
3. Copy the updated content from the `code.gs` file
4. Click "Deploy" > "New deployment"
5. Choose type "Web app"
6. Recommended configuration:
   - **Execute as**: Me (your account)
   - **Who has access**: Anyone (to allow access from your backend)
   - Or if you prefer more security: "Anyone in your organization"
7. Click "Deploy"
8. **IMPORTANT**: Copy the deployment URL that looks like:
   ```
   https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

### Update Django configuration:

1. Open the file `cti4bc_backend/cti4bc_backend/forms/google_forms_service.py`
2. Replace the line:
   ```python
   APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
   ```
   With your actual deployment URL.

## 2. Test the deployment

### Direct Web App test:
You can test your Web App directly by navigating to:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?formUrl=https://docs.google.com/forms/d/FORM_ID/edit
```

### Test from Django API:
1. Start your Django server
2. Use a tool like Postman or curl to test the endpoint:
   ```bash
   curl -X POST http://localhost:8000/api/forms/import-google-form/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"form_url": "https://docs.google.com/forms/d/FORM_ID/edit"}'
   ```

## 3. Available endpoints

### Import by URL:
```bash
POST /api/forms/import-google-form/
{
  "form_url": "https://docs.google.com/forms/d/FORM_ID/edit",
  "organizations": [1, 2]  // optional
}
```

### Import by JSON file:
```bash
POST /api/forms/import-google-form/
Content-Type: multipart/form-data

json_file: [.json file with Apps Script format]
organizations: [1, 2]  // optional
```

### Import by JSON in body:
```bash
POST /api/forms/import-google-form/
{
  "json_data": { /* JSON in Apps Script format */ },
  "organizations": [1, 2]  // optional
}
```

## 4. Accepted JSON format

The system only accepts JSON format produced by Google Apps Script, which looks like:
```json
{
  "metadata": {
    "title": "Form title",
    "id": "form_id",
    "description": "Description",
    ...
  },
  "items": [
    {
      "type": "TEXT",
      "title": "Question",
      "id": 123456,
      "isRequired": true,
      ...
    }
  ],
  "count": 10
}
```

## 5. Permissions and security

- Ensure the Google Apps Script has necessary permissions to access forms
- The first time a user accesses a form via the script, Google may request authorization
- For production, consider restricting access to your organization only
