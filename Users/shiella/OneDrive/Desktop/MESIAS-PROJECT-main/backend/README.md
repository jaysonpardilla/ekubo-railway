# MSWDO Backend - Django REST API

This is a refactored version of the backend that uses Django and Django REST Framework instead of Node.js/Express.

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Edit the `.env` file and set your secret keys:
   ```
   SECRET_KEY=your-secret-key-here
   JWT_SECRET=your-jwt-secret-key-here
   DEBUG=True
   ```

5. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create a superuser (optional for admin access):**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start the development server:**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

   Or use the provided startup scripts:
   ```bash
   # Windows
   start.bat
   
   # macOS/Linux
   bash start.sh
   ```

The API will be available at: `http://localhost:8000/api`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/` - List all users (admin/mswdo only)
- `GET /api/users/<id>` - Get user details
- `PATCH /api/users/<id>` - Update user profile
- `GET /api/users/stats/counts` - Get user statistics (admin only)

### Beneficiaries
- `GET /api/beneficiaries/` - List beneficiaries
- `GET /api/beneficiaries/<id>` - Get beneficiary details
- `POST /api/beneficiaries/` - Create beneficiary profile
- `PATCH /api/beneficiaries/<id>` - Update beneficiary profile

### Applications
- `GET /api/applications/` - List applications
- `GET /api/applications/<id>` - Get application details
- `POST /api/applications/` - Create application
- `PATCH /api/applications/<id>` - Update application status
- `GET /api/applications/stats/counts` - Get application statistics

### Programs
- `GET /api/programs/` - List active programs
- `GET /api/programs/<id>` - Get program details
- `POST /api/programs/` - Create program (admin/mswdo only)
- `PATCH /api/programs/<id>` - Update program (admin/mswdo only)

### Notifications
- `GET /api/notifications/` - Get user notifications
- `POST /api/notifications/` - Create notification
- `PATCH /api/notifications/<id>/read` - Mark notification as read
- `DELETE /api/notifications/<id>` - Delete notification

### File Upload
- `POST /api/upload/` - Upload file (returns file URL)

## Database

The backend uses SQLite database stored at `database.db` in the project root. All models are defined in `core/models.py`.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_token_here>
```

## Frontend Integration

The frontend React application is configured to communicate with this backend. Make sure:
1. The backend is running on `http://localhost:8000`
2. CORS is properly configured in Django settings
3. The frontend uses the correct API base URL

## Troubleshooting

### Database Issues
If you encounter database errors, try:
```bash
python manage.py migrate --run-syncdb
```

### Port Already in Use
If port 8000 is already in use:
```bash
python manage.py runserver 0.0.0.0:8001
```

Then update the frontend API_BASE_URL accordingly.

### Module Not Found
Make sure you've activated the virtual environment and installed all dependencies:
```bash
pip install -r requirements.txt
```

## Features Maintained

All features and functionality from the original Node.js backend have been preserved:

✅ User authentication (signup/login)
✅ Role-based access control (beneficiary, admin, bhw, mswdo)
✅ Beneficiary profile management
✅ Program management
✅ Application workflow (pending → bhw_verified → mswdo_approved → scheduled → claimed)
✅ BHW assignments by barangay
✅ Notifications system
✅ File uploads
✅ User statistics and application tracking

## Production Deployment

For production deployment:
1. Set `DEBUG=False` in `.env`
2. Update `ALLOWED_HOSTS` in `settings.py`
3. Use a production WSGI server (e.g., Gunicorn)
4. Set up a proper database (PostgreSQL recommended)
5. Configure proper JWT secret keys
