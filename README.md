# BARKERVILLE FREIGHT — Trucking ERP (MySQL)

Full-stack ERP: Fleet · Drivers · Customers · Trips · Invoices (PDF)

---

## Requirements

- Python 3.11 or 3.12 (NOT 3.13 or 3.14)
- MySQL 8.0+ (or XAMPP / WAMP)
- Node.js 18+

---

## Step 1 — Create MySQL Database

Open MySQL Workbench or the XAMPP phpMyAdmin, then run:

```sql
CREATE DATABASE trucking_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or from the MySQL command line:
```bash
mysql -u root -p
CREATE DATABASE trucking_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit
```

---

## Step 2 — Backend Setup

Open a terminal in VS Code, navigate to the backend folder:

```bash
cd backend
```

Create and activate a virtual environment (Python 3.11):
```bash
py -3.11 -m venv venv
venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

> If mysqlclient fails, run this first:
> pip install mysqlclient --only-binary=:all:

Copy and edit the .env file:
```bash
copy .env.example .env
```

Open .env and set your MySQL password:
```
DB_NAME=trucking_erp
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_HOST=localhost
DB_PORT=3306
```

Run migrations:
```bash
python manage.py makemigrations api
python manage.py migrate
```

Create admin user:
```bash
python manage.py createsuperuser
```

Start the backend:
```bash
python manage.py runserver
```

API runs at: http://localhost:8000/api/
Django Admin: http://localhost:8000/admin/

---

## Step 3 — Frontend Setup

Open a second terminal in VS Code:

```bash
cd frontend
npm install
npm run dev
```

App opens at: http://localhost:3000

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/ | Dashboard stats |
| GET/POST | /api/drivers/ | List / add drivers |
| GET/POST | /api/trucks/ | List / add trucks |
| GET/POST | /api/customers/ | List / add customers |
| GET/POST | /api/trips/ | List / add trips |
| POST | /api/trips/{id}/update_status/ | Start / complete a trip |
| POST | /api/trips/{id}/generate_invoice/ | Auto-create invoice from trip |
| GET/POST | /api/invoices/ | List / create invoices |
| GET | /api/invoices/{id}/pdf/ | Download PDF |
| POST | /api/invoices/{id}/mark_paid/ | Mark invoice paid |
| GET/POST | /api/maintenance/ | Maintenance records |

---

## Workflow

1. Add **Customers**, **Trucks**, **Drivers**
2. Create a **Trip** → assign truck, driver, customer, route, freight amount
3. Click **Start** → trip goes In Progress
4. Click **Complete** → trip finished, driver freed
5. Click **Invoice** → auto-generates invoice INV-00001
6. In Invoices tab → **PDF** to download, **Paid** to mark settled
