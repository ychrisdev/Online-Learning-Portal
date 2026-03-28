# EnglishHub

Nền tảng học tiếng Anh trực tuyến (A1–C2) với hệ thống phân quyền: Học viên – Giảng viên – Quản trị viên.

---

## Công nghệ sử dụng

* **Frontend:** React + TypeScript
* **Backend:** Django REST Framework
* **Database:** PostgreSQL

---

## Chạy dự án

### Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Cấu trúc dự án

```bash
englishhub/
├── backend/
│   ├── apps/
│   ├── config/
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── App.tsx
│   └── package.json
```

---

## Tính năng chính

* Phân quyền: Student / Instructor / Admin
* Quản lý khóa học
* Theo dõi tiến độ học tập
