export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  title: string;
  bio: string;
  rating: number;
  totalStudents: number;
  totalCourses: number;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'article' | 'project';
  isPreview: boolean;
  isCompleted?: boolean;
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  previewVideo?: string;
  instructor: Instructor;
  category: string;
  level: CourseLevel;
  rating: number;
  reviewCount: number;
  studentCount: number;
  price: number;
  originalPrice?: number;
  currency: string;
  duration: string;
  lessonCount: number;
  language: string;
  lastUpdated: string;
  tags: string[];
  curriculum: Section[];
  whatYouLearn: string[];
  requirements: string[];
  isBestseller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
}

export interface Review {
  id: string;
  user: { name: string; avatar: string };
  rating: number;
  comment: string;
  date: string;
  courseId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  enrolledCourses: string[];
  completedCourses: string[];
  role: 'student' | 'instructor' | 'admin';
}

export interface EnrolledCourse {
  course: Course;
  progress: number;       // 0–100
  lastAccessedAt: string;
  completedLessons: string[];
}

export interface Category {
  id: string;
  name: string;
  courseCount: number;
  color: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  role: string;
  quote: string;
  rating: number;
}

// ── UI types ─────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';
export type InputSize     = 'sm' | 'md' | 'lg';

export interface FilterState {
  category: string;
  level: CourseLevel | '';
  priceRange: 'all' | 'free' | 'paid';
  rating: number;
  search: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}