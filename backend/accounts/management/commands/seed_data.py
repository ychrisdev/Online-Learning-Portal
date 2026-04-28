"""
management/commands/seed_data.py
=================================
Chạy: python manage.py seed_data
Tạo dữ liệu mẫu:
  - 1 admin
  - 3 giảng viên
  - 10 học viên
  - 26 khóa học + section + lesson + quiz
  - Ví điện tử
KHÔNG tạo: enrollment, transaction, review
"""
import uuid
import random
from decimal import Decimal
from datetime import timedelta, date
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth import get_user_model

User = get_user_model()


def uid():
    return uuid.uuid4()

def now():
    return timezone.now()

def days_ago(n):
    return now() - timedelta(days=n)


# ──────────────────────────────────────────────
# DATA CONSTANTS
# ──────────────────────────────────────────────

CATEGORIES_DATA = [
    ("A1 - Beginner",           "a1-beginner",           "Tiếng Anh cơ bản nhất dành cho người mới bắt đầu hoàn toàn.", True, 1),
    ("A2 - Elementary",         "a2-elementary",          "Củng cố nền tảng và mở rộng vốn từ cơ bản.", True, 2),
    ("B1 - Intermediate",       "b1-intermediate",        "Giao tiếp tự tin trong các tình huống quen thuộc.", True, 3),
    ("B2 - Upper Intermediate", "b2-upper-intermediate",  "Hiểu và diễn đạt ý tưởng phức tạp hơn.", True, 4),
    ("C1 - Advanced",           "c1-advanced",            "Sử dụng tiếng Anh linh hoạt và chính xác.", True, 5),
    ("C2 - Mastery",            "c2-mastery",             "Trình độ thành thạo gần như người bản ngữ.", True, 6),
    ("Từ vựng",                 "tu-vung",                "Mở rộng vốn từ theo chủ đề và ngữ cảnh.", True, 7),
    ("Phát âm",                 "phat-am",                "Luyện phát âm chuẩn theo giọng Anh-Anh và Anh-Mỹ.", True, 8),
    ("Ngữ pháp",                "ngu-phap",               "Hệ thống ngữ pháp từ cơ bản đến nâng cao.", True, 9),
]

INSTRUCTOR_DATA = [
    (
        "ms_nguyen", "Nguyễn Thị Lan Anh", "lan.anh@englearn.vn",
        "Thạc sĩ TESOL - 12 năm kinh nghiệm",
        "IELTS, Business English, Academic Writing", 12,
        "CELTA, IELTS Examiner, British Council Certified",
    ),
    (
        "mr_tran", "Trần Văn Minh", "van.minh@englearn.vn",
        "Cử nhân Ngôn ngữ Anh - Chuyên gia phát âm",
        "Phonetics, American Accent, Pronunciation Coaching", 8,
        "TEFL, Accent Reduction Specialist",
    ),
    (
        "dr_pham", "Phạm Thị Hương", "thi.huong@englearn.vn",
        "Tiến sĩ Ngôn ngữ học - Chuyên gia ngữ pháp",
        "Grammar, Linguistics, TOEFL, Academic English", 15,
        "DELTA, TESOL, Cambridge TKT",
    ),
]

COURSES_DATA = [
    # (title, description, category_slug, level, price, discount_percent, what_you_learn, requirements, is_featured)
    ("Tiếng Anh A1: Bắt Đầu Từ Con Số 0",
     "Khóa học hoàn toàn cho người mới, học bảng chữ cái, số đếm, chào hỏi cơ bản.",
     "a1-beginner", "beginner", 299000, 0,
     "Bảng chữ cái, số đếm 1-100, chào hỏi, giới thiệu bản thân, màu sắc, ngày tháng.",
     "Không cần kiến thức tiếng Anh trước.", True),
    ("Giao Tiếp A1: Những Câu Tiếng Anh Đầu Tiên",
     "Học 200 câu giao tiếp thiết yếu nhất, phát âm từng từ rõ ràng.",
     "a1-beginner", "beginner", 349000, 10,
     "200 câu giao tiếp hàng ngày, phát âm chuẩn, hội thoại cơ bản.",
     "Biết 26 chữ cái tiếng Anh.", False),
    ("Từ Vựng A1: 500 Từ Thiết Yếu",
     "Học 500 từ vựng phổ biến nhất theo chủ đề gia đình, thức ăn, nơi chốn.",
     "a1-beginner", "beginner", 199000, 0,
     "500 từ theo 10 chủ đề, flashcard, bài tập điền từ.",
     "Không yêu cầu.", False),
    ("A2 Grammar: Ngữ Pháp Nền Tảng",
     "Hệ thống hóa ngữ pháp A2: thì hiện tại, quá khứ đơn, câu hỏi Yes/No.",
     "a2-elementary", "beginner", 449000, 15,
     "Thì hiện tại đơn, hiện tại tiếp diễn, quá khứ đơn, tương lai gần.",
     "Hoàn thành A1 hoặc tương đương.", True),
    ("A2 Listening: Luyện Nghe Thực Tế",
     "50 đoạn hội thoại ngắn về cuộc sống hàng ngày với transcript đầy đủ.",
     "a2-elementary", "beginner", 399000, 0,
     "Nghe hiểu hội thoại ngắn, phân biệt giọng Anh-Mỹ, luyện dictation.",
     "Trình độ A1.", False),
    ("A2 Speaking: Tự Tin Giao Tiếp",
     "Thực hành nói qua 30 tình huống thực tế: đi chợ, đặt phòng, hỏi đường.",
     "a2-elementary", "beginner", 499000, 20,
     "Nói lưu loát trong 30 tình huống, tự giới thiệu, đặt câu hỏi.",
     "Trình độ A1.", False),
    ("B1 Intermediate: Nâng Cấp Toàn Diện",
     "Khóa học toàn diện nâng trình độ từ A2 lên B1 với 4 kỹ năng.",
     "b1-intermediate", "intermediate", 699000, 30,
     "4 kỹ năng nghe-nói-đọc-viết B1, thì hoàn thành, câu điều kiện loại 1&2.",
     "Trình độ A2 trở lên.", True),
    ("B1 Business English: Tiếng Anh Văn Phòng",
     "Email, báo cáo, họp nhóm và thuyết trình bằng tiếng Anh cấp độ B1.",
     "b1-intermediate", "intermediate", 799000, 0,
     "Viết email chuyên nghiệp, họp nhóm, thuyết trình ngắn, từ vựng văn phòng.",
     "Trình độ B1.", False),
    ("B1 IELTS Preparation: Nền Tảng IELTS",
     "Làm quen format IELTS, chiến lược cơ bản cho 4 kỹ năng, target band 5.0-5.5.",
     "b1-intermediate", "intermediate", 899000, 10,
     "Hiểu format IELTS, chiến lược Reading Skimming/Scanning, Writing Task 1 cơ bản.",
     "Trình độ B1.", False),
    ("B2 Upper: Tiếng Anh Nâng Cao Thực Dụng",
     "Đọc báo, xem phim không phụ đề, viết essay cấp độ B2.",
     "b2-upper-intermediate", "intermediate", 999000, 25,
     "Đọc hiểu báo The Guardian, viết essay 250 từ, nghe TED Talks.",
     "Trình độ B1 vững chắc.", True),
    ("B2 IELTS Band 6.0-6.5: Chinh Phục IELTS",
     "Luyện thi IELTS mục tiêu band 6.0-6.5 với đề thi thật và feedback chi tiết.",
     "b2-upper-intermediate", "intermediate", 1299000, 30,
     "Chiến lược Writing Task 2, Speaking Part 1-3, Reading 40+/40 câu.",
     "Đã làm quen IELTS, trình độ B1+.", False),
    ("B2 Grammar Mastery: Ngữ Pháp Nâng Cao",
     "Nắm vững các điểm ngữ pháp khó: câu bị động, mệnh đề quan hệ, inversion.",
     "b2-upper-intermediate", "advanced", 749000, 0,
     "Câu bị động phức tạp, mệnh đề quan hệ rút gọn, subjunctive, inversion.",
     "Trình độ B1 trở lên.", False),
    ("C1 Advanced: Tiếng Anh Học Thuật",
     "Đọc nghiên cứu khoa học, viết luận văn bằng tiếng Anh, thuyết trình học thuật.",
     "c1-advanced", "advanced", 1499000, 20,
     "Academic writing, critical reading, debate, research skills tiếng Anh.",
     "Trình độ B2+.", True),
    ("C1 IELTS 7.0+: Đỉnh Cao IELTS",
     "Luyện IELTS band 7.0 trở lên với feedback 1-1 và đề thi Cambridge chính thức.",
     "c1-advanced", "advanced", 1999000, 15,
     "Band 7+ trong cả 4 kỹ năng, Writing Task 2 cohesion, Speaking band 7 descriptors.",
     "IELTS 6.5 hoặc tương đương C1.", False),
    ("C1 Business Masterclass: Tiếng Anh Doanh Nghiệp",
     "Negotiation, boardroom language, cross-cultural communication ở cấp C1.",
     "c1-advanced", "advanced", 1799000, 0,
     "Đàm phán hợp đồng, viết report chuyên nghiệp, thuyết trình boardroom.",
     "Trình độ B2+, đang đi làm.", False),
    ("C2 Mastery: Gần Như Người Bản Ngữ",
     "Tinh chỉnh idioms, collocations, nuances và register để đạt C2.",
     "c2-mastery", "advanced", 2499000, 10,
     "1000 idioms thông dụng, collocations nâng cao, phong cách viết đa dạng.",
     "Trình độ C1.", True),
    ("C2 Literary English: Đọc Văn Học Tiếng Anh",
     "Đọc và phân tích tác phẩm văn học Anh-Mỹ: Shakespeare, Hemingway, Orwell.",
     "c2-mastery", "advanced", 1999000, 0,
     "Phân tích văn học, từ vựng archaic, viết literary essay.",
     "Trình độ C1+.", False),
    ("C2 Debate & Rhetoric: Hùng Biện Tiếng Anh",
     "Tranh luận, thuyết phục và hùng biện tiếng Anh theo phong cách Oxford Union.",
     "c2-mastery", "advanced", 2299000, 5,
     "Kỹ thuật tranh luận, rhetoric devices, impromptu speaking, rebuttal.",
     "Trình độ C1+.", False),
    ("Từ Vựng Theo Chủ Đề: Cuộc Sống Hàng Ngày",
     "1000 từ vựng thiết yếu theo 20 chủ đề quen thuộc với hình ảnh minh họa.",
     "tu-vung", "beginner", 299000, 0,
     "1000 từ vựng, flashcard tương tác, bài tập ghép từ, ví dụ trong câu.",
     "Không yêu cầu.", True),
    ("Từ Vựng Học Thuật: Academic Word List",
     "570 từ trong Academic Word List - thiết yếu cho IELTS và học thuật.",
     "tu-vung", "intermediate", 599000, 20,
     "570 từ AWL, cách dùng trong bài viết học thuật, collocation.",
     "Trình độ B1+.", False),
    ("Idioms & Phrases: Thành Ngữ Tiếng Anh",
     "500 idiom và cụm từ thông dụng nhất trong giao tiếp tự nhiên.",
     "tu-vung", "intermediate", 499000, 0,
     "500 idioms, nguồn gốc, cách dùng đúng ngữ cảnh, bài tập thực hành.",
     "Trình độ B1+.", False),
    ("Phát Âm Chuẩn Anh-Mỹ: Từ Zero Đến Hero",
     "Học IPA, luyện 44 âm chuẩn American English từ đầu.",
     "phat-am", "beginner", 399000, 15,
     "44 âm IPA, stressed/unstressed syllables, linking sounds, intonation cơ bản.",
     "Không yêu cầu.", True),
    ("Pronunciation: Giọng Anh-Anh RP",
     "Luyện Received Pronunciation (RP) - giọng Anh chuẩn BBC.",
     "phat-am", "intermediate", 599000, 0,
     "RP vowels & consonants, stress patterns, BBC English intonation.",
     "Đã biết IPA cơ bản.", False),
    ("Minimal Pairs & Connected Speech",
     "Phân biệt âm khó, luyện connected speech: linking, elision, assimilation.",
     "phat-am", "advanced", 499000, 10,
     "50 cặp minimal pairs, reduction sounds, connected speech tự nhiên.",
     "Trình độ B1+, biết IPA.", False),
    ("Ngữ Pháp A-Z: Hệ Thống Toàn Diện",
     "Toàn bộ ngữ pháp tiếng Anh từ cơ bản đến nâng cao trong 1 khóa học.",
     "ngu-phap", "beginner", 799000, 30,
     "12 thì, câu điều kiện, bị động, mệnh đề quan hệ, tường thuật.",
     "Không yêu cầu.", True),
    ("Tenses Masterclass: 12 Thì Tiếng Anh",
     "Nắm vững 12 thì với bài tập phân biệt và ứng dụng thực tế.",
     "ngu-phap", "intermediate", 499000, 0,
     "12 thì, cách phân biệt thì gần nhau, signal words, bài tập 500 câu.",
     "Biết các thì cơ bản.", False),
    ("Advanced Grammar: Điểm Ngữ Pháp Khó",
     "Inversion, cleft sentences, subjunctive, ellipsis - các điểm khó nhất.",
     "ngu-phap", "advanced", 699000, 20,
     "Inversion, cleft sentences, subjunctive mood, ellipsis, fronting.",
     "Trình độ B2+.", False),
]

STUDENT_DATA = [
    ("hoc_vien_01", "Lê Thị Mai",       "mai.le@gmail.com",    "female", "1998-03-15", "Ho Chi Minh", "Nhân viên văn phòng", "bachelor"),
    ("hoc_vien_02", "Nguyễn Văn Hùng",  "hung.nguyen@gmail.com","male",  "1995-07-20", "Hanoi",       "Kỹ sư phần mềm",     "bachelor"),
    ("hoc_vien_03", "Trần Thị Bích",    "bich.tran@gmail.com", "female", "2001-11-05", "Da Nang",     "Sinh viên",           "college"),
    ("hoc_vien_04", "Phạm Minh Đức",    "duc.pham@gmail.com",  "male",   "1990-04-22", "Ho Chi Minh", "Giáo viên",           "master"),
    ("hoc_vien_05", "Hoàng Thị Lan",    "lan.hoang@gmail.com", "female", "2000-08-14", "Can Tho",     "Sinh viên",           "bachelor"),
    ("hoc_vien_06", "Vũ Quốc Bảo",      "bao.vu@gmail.com",    "male",   "1993-12-30", "Hanoi",       "Kế toán",             "bachelor"),
    ("hoc_vien_07", "Đỗ Thị Thu Hà",    "ha.do@gmail.com",     "female", "1997-06-18", "Ho Chi Minh", "Nhân viên marketing", "bachelor"),
    ("hoc_vien_08", "Ngô Văn Tài",      "tai.ngo@gmail.com",   "male",   "2002-02-28", "Hue",         "Học sinh THPT",       "high_school"),
    ("hoc_vien_09", "Bùi Thị Ngọc",     "ngoc.bui@gmail.com",  "female", "1988-09-10", "Ho Chi Minh", "Bác sĩ",              "doctor"),
    ("hoc_vien_10", "Lý Văn Thắng",     "thang.ly@gmail.com",  "male",   "1999-05-03", "Hai Phong",   "Sinh viên",           "bachelor"),
]


class Command(BaseCommand):
    help = "Seed dữ liệu mẫu: admin, giảng viên, học viên, khóa học, quiz, ví"

    def handle(self, *args, **options):
        self.stdout.write("🌱 Bắt đầu seed data...")
        self._clean()
        categories  = self._seed_categories()
        admin       = self._seed_admin()
        instructors = self._seed_instructors()
        students    = self._seed_students()
        courses     = self._seed_courses(categories, instructors)
        self._seed_sections_lessons(courses)
        self._seed_quizzes(courses)
        self._seed_wallets(instructors + students + [admin])
        self.stdout.write(self.style.SUCCESS("✅ Seed data hoàn tất!"))

    # ──────────────────────────────────────────
    def _clean(self):
        self.stdout.write("  🗑  Xoá dữ liệu cũ...")
        from courses.models import Category, Course, Section, Lesson, Review
        from enrollments.models import Enrollment, Progress, Certificate
        from payments.models import Transaction
        from quizzes.models import Quiz, Question, Answer, QuizAttempt
        from wallet.models import Wallet, WalletTransaction, WithdrawalRequest

        WithdrawalRequest.objects.all().delete()
        WalletTransaction.objects.all().delete()
        Wallet.objects.all().delete()
        QuizAttempt.objects.all().delete()
        Answer.objects.all().delete()
        Question.objects.all().delete()
        Quiz.objects.all().delete()
        Progress.objects.all().delete()
        Certificate.objects.all().delete()
        Enrollment.objects.all().delete()
        Transaction.objects.all().delete()
        Review.objects.all().delete()
        Lesson.objects.all().delete()
        Section.objects.all().delete()
        Course.objects.all().delete()
        Category.objects.all().delete()
        User.objects.all().delete()

    # ──────────────────────────────────────────
    def _seed_categories(self):
        from courses.models import Category
        self.stdout.write("  📂 Tạo danh mục...")
        cats = {}
        for name, slug, desc, pinned, order in CATEGORIES_DATA:
            c = Category.objects.create(
                name=name, slug=slug, description=desc,
                is_pinned=pinned, pin_order=order,
            )
            cats[slug] = c
        return cats

    # ──────────────────────────────────────────
    def _seed_admin(self):
        self.stdout.write("  👑 Tạo admin...")
        return User.objects.create_superuser(
            username="admin",
            email="admin@englearn.vn",
            password="Admin@123456",
            full_name="Quản Trị Viên",
            role="admin",
        )

    # ──────────────────────────────────────────
    def _seed_instructors(self):
        from accounts.models import InstructorProfile
        self.stdout.write("  🎓 Tạo giảng viên...")
        instructors = []
        for username, full_name, email, title, specs, years, certs in INSTRUCTOR_DATA:
            u = User.objects.create_user(
                username=username,
                email=email,
                password="Instructor@123",
                full_name=full_name,
                role="instructor",
                bio=f"{title}. Chuyên môn: {specs}.",
            )
            InstructorProfile.objects.create(
                user=u,
                title=title,
                specializations=specs,
                years_experience=years,
                certifications=certs,
                phone_number=f"09{random.randint(10000000, 99999999)}",
                total_students=random.randint(200, 2000),
                total_courses=5,
                avg_rating=round(random.uniform(4.2, 4.9), 1),
            )
            instructors.append(u)
        return instructors

    # ──────────────────────────────────────────
    def _seed_students(self):
        from accounts.models import StudentProfile
        self.stdout.write("  👩‍🎓 Tạo học viên...")
        students = []
        for username, full_name, email, gender, dob, city, occupation, education in STUDENT_DATA:
            u = User.objects.create_user(
                username=username,
                email=email,
                password="Student@123",
                full_name=full_name,
                role="student",
            )
            StudentProfile.objects.create(
                user=u,
                gender=gender,
                date_of_birth=date.fromisoformat(dob),
                city=city,
                occupation=occupation,
                education=education,
                phone_number=f"09{random.randint(10000000, 99999999)}",
            )
            students.append(u)
        return students

    # ──────────────────────────────────────────
    def _seed_courses(self, categories, instructors):
        from courses.models import Course
        self.stdout.write("  📚 Tạo khóa học...")
        courses = []
        for i, data in enumerate(COURSES_DATA):
            (title, desc, cat_slug, level, price, discount,
             what_learn, requirements, featured) = data
            instructor = instructors[i % len(instructors)]
            course = Course.objects.create(
                instructor=instructor,
                category=categories[cat_slug],
                title=title,
                slug=slugify(title),
                description=desc,
                price=price,
                discount_percent=discount,
                level=level,
                status="published",
                what_you_learn=what_learn,
                requirements=requirements,
                is_featured=featured,
                avg_rating=round(random.uniform(3.8, 5.0), 1),
                total_students=random.randint(50, 1500),
                published_at=days_ago(random.randint(30, 365)),
            )
            courses.append(course)
        return courses

    # ──────────────────────────────────────────
    def _seed_sections_lessons(self, courses):
        from courses.models import Section, Lesson
        self.stdout.write("  📖 Tạo chương & bài học...")
        SECTION_TEMPLATES = [
            ("Giới thiệu & Tổng quan",  "Làm quen với nội dung và cấu trúc khóa học."),
            ("Nền tảng kiến thức",       "Các khái niệm và kỹ năng cơ bản cần thiết."),
            ("Thực hành cơ bản",         "Bài tập và ứng dụng kiến thức cơ bản."),
            ("Nâng cao & Mở rộng",       "Đào sâu và mở rộng kiến thức đã học."),
            ("Ôn tập & Kiểm tra",        "Tổng hợp và kiểm tra toàn bộ kiến thức."),
        ]
        VIDEO_URLS = [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://vimeo.com/76979871",
            "https://www.youtube.com/watch?v=9bZkp7q19f0",
        ]
        for course in courses:
            num_sections = random.randint(2, 4)
            for s_idx, (s_title, s_desc) in enumerate(SECTION_TEMPLATES[:num_sections]):
                section = Section.objects.create(
                    course=course,
                    title=f"Chương {s_idx + 1}: {s_title}",
                    description=s_desc,
                    order_index=s_idx,
                )
                lesson_types = ["video", "article", "resource"]
                for l_idx in range(random.randint(3, 5)):
                    l_type = lesson_types[l_idx % len(lesson_types)]
                    is_first = (l_idx == 0)
                    if l_type == "video":
                        Lesson.objects.create(
                            section=section,
                            title=f"Bài {l_idx + 1}: Video bài giảng - {s_title}",
                            video_url=random.choice(VIDEO_URLS),
                            order_index=l_idx,
                            is_preview_video=is_first,
                        )
                    elif l_type == "article":
                        Lesson.objects.create(
                            section=section,
                            title=f"Bài {l_idx + 1}: Bài đọc - {s_title}",
                            content=f"# {s_title}\n\nNội dung bài đọc tổng hợp kiến thức về **{s_title}** trong khóa học **{course.title}**.",
                            order_index=l_idx,
                            is_preview_article=is_first,
                        )
                    else:
                        Lesson.objects.create(
                            section=section,
                            title=f"Bài {l_idx + 1}: Tài liệu tham khảo - {s_title}",
                            content=f"Tài liệu bổ sung cho {s_title}.",
                            attachment_name=f"tai-lieu-{slugify(s_title)}.pdf",
                            order_index=l_idx,
                            is_preview_resource=is_first,
                        )

    # ──────────────────────────────────────────
    def _seed_quizzes(self, courses):
        from quizzes.models import Quiz, Question, Answer
        self.stdout.write("  📝 Tạo quiz & câu hỏi...")
        QUIZ_QUESTIONS = {
            "single": [
                ("Which sentence is grammatically correct?",
                 [("She go to school every day.", False), ("She goes to school every day.", True),
                  ("She going to school every day.", False), ("She goed to school every day.", False)],
                 "Third person singular uses 's' with the verb."),
                ("What is the past tense of 'go'?",
                 [("goed", False), ("gone", False), ("went", True), ("going", False)],
                 "'Went' is the irregular past tense of 'go'."),
                ("Choose the correct article: ___ umbrella.",
                 [("a", False), ("an", True), ("the", False), ("no article", False)],
                 "Use 'an' before words starting with a vowel sound."),
            ],
            "multiple": [
                ("Which of the following are modal verbs?",
                 [("can", True), ("run", False), ("should", True), ("must", True), ("walk", False)],
                 "Modal verbs: can, could, should, must, will, would, may, might."),
                ("Which sentences use the Present Perfect correctly?",
                 [("I have eaten breakfast.", True), ("She has went to Paris.", False),
                  ("They have finished the project.", True), ("He have studied English.", False)],
                 "Present Perfect: have/has + past participle."),
            ],
            "true_false": [
                ("'Since' is used with a point in time, while 'for' is used with a duration of time.",
                 [("True", True), ("False", False)],
                 "Since = point in time. For = duration."),
                ("In English, adjectives come AFTER the noun they modify.",
                 [("True", False), ("False", True)],
                 "Adjectives usually come BEFORE the noun in English."),
                ("The sentence 'She don't like coffee' is grammatically correct.",
                 [("True", False), ("False", True)],
                 "Correct: 'She doesn't like coffee'."),
            ],
        }
        for course in courses:
            quiz_count = 0
            for section in course.sections.all():
                if quiz_count >= 2:
                    break
                for lesson in section.lessons.all():
                    if Quiz.objects.filter(lesson=lesson).exists():
                        continue
                    quiz = Quiz.objects.create(
                        lesson=lesson,
                        title=f"Kiểm tra: {section.title}",
                        description="Làm bài kiểm tra để củng cố kiến thức vừa học.",
                        pass_score=70,
                        time_limit=random.choice([0, 10, 15, 20]),
                        max_attempts=random.choice([0, 2, 3]),
                    )
                    for order, (q_type, q_list) in enumerate(QUIZ_QUESTIONS.items()):
                        q_content, answers_data, explanation = random.choice(q_list)
                        question = Question.objects.create(
                            quiz=quiz,
                            content=q_content,
                            question_type=q_type,
                            points=random.choice([1, 2]),
                            explanation=explanation,
                            order_index=order,
                        )
                        for a_idx, (a_content, a_correct) in enumerate(answers_data):
                            Answer.objects.create(
                                question=question,
                                content=a_content,
                                is_correct=a_correct,
                                order_index=a_idx,
                            )
                    quiz_count += 1
                    break

    # ──────────────────────────────────────────
    def _seed_wallets(self, users):
        from wallet.models import Wallet, WalletTransaction, WithdrawalRequest
        self.stdout.write("  💰 Tạo ví điện tử...")
        for user in users:
            balance = random.randint(0, 5000000)
            wallet = Wallet.objects.create(user=user, balance=balance)
            for _ in range(random.randint(1, 3)):
                tx_type = random.choice(["deposit", "payment", "refund", "revenue"])
                amount = random.randint(50000, 500000)
                WalletTransaction.objects.create(
                    wallet=wallet,
                    tx_type=tx_type,
                    amount=amount,
                    balance_after=balance,
                    status=random.choice(["completed", "pending"]),
                    note=f"Giao dịch {tx_type}",
                )
            if user.role == "instructor" and random.random() > 0.4:
                WithdrawalRequest.objects.create(
                    wallet=wallet,
                    amount=random.randint(500000, 2000000),
                    bank_name=random.choice(["Vietcombank", "BIDV", "Techcombank", "MB Bank"]),
                    bank_account=str(random.randint(1000000000, 9999999999)),
                    account_name=user.full_name,
                    status=random.choice(["pending", "approved", "rejected"]),
                    note="Rút tiền doanh thu khóa học.",
                )