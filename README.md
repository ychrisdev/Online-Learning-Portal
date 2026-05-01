# EnglishHub

Nền tảng học tiếng Anh trực tuyến (A1–C2) với hệ thống phân quyền: Học viên – Giảng viên – Quản trị viên.

---

## Công nghệ sử dụng

* **Frontend:** React + TypeScript
* **Backend:** Django REST Framework
* **Database:** PostgreSQL
* **Task Queue:** Celery + Redis

---
## Yêu cầu hệ thống

- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis

---
## Chạy dự án
> **Thứ tự khởi động:** Redis → Django → Celery → Frontend
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

**Phân quyền** — Student / Instructor / Admin
**Quản lý khóa học** — tạo, chỉnh sửa, xuất bản
**Theo dõi tiến độ** — theo từng bài học
**Thanh toán** — Ví EnglishHub, MoMo
**Hoàn tiền** — quy trình 3 bước: Student → Admin → Instructor
**Email tự động** — thông báo thanh toán, hoàn tiền, cảnh báo
**Khóa tài khoản tự động** — giảng viên không hoàn tiền đúng hạn 48 tiếng
