import React from 'react';
import { formatPrice } from '../../utils/format';

const API = 'http://127.0.0.1:8000';

export const thumbSrc = (t: string | null) =>
  !t ? 'https://placehold.co/400x225?text=No+Image' : t.startsWith('http') ? t : `${API}${t}`;

export const LEVEL_LABEL: Record<string, string> = {
  beginner:     'Cơ bản',
  intermediate: 'Trung cấp',
  advanced:     'Nâng cao',
  'Tất cả':     'Tất cả',
};

interface CardProps {
  course: any;
  onSelect: () => void;
}

const CourseListCard: React.FC<CardProps> = ({ course, onSelect }) => {
  const price         = Number(course.sale_price ?? course.price ?? 0);
  const originalPrice = Number(course.price ?? 0);
  const discount      = course.discount_percent ?? 0;
  const isFree        = price === 0;

  return (
    <button className="course-card" onClick={onSelect}>
      <div className="course-card__thumb">
        <img src={thumbSrc(course.thumbnail)} alt={course.title} />
        {course.is_featured && (
          <span className="course-card__badge course-card__badge--best">Nổi bật</span>
        )}
        {isFree && (
          <span className="course-card__badge course-card__badge--free">Miễn phí</span>
        )}
        {discount > 0 && !isFree && (
          <span className="course-card__badge course-card__badge--sale">-{discount}%</span>
        )}
      </div>

      <div className="course-card__body">
        <div className="course-card__meta">
          {course.category_name && (
            <span className="course-card__cat">{course.category_name}</span>
          )}
          <span className="course-card__level">
            {LEVEL_LABEL[course.level] ?? course.level}
          </span>
        </div>

        <h3 className="course-card__title">{course.title}</h3>

        {course.instructor_name && (
          <div className="course-card__instructor">
            <span>{course.instructor_name}</span>
          </div>
        )}

        <div className="course-card__stats">
          {course.avg_rating > 0 && (
            <>
              <span className="course-card__rating">
                ★ {Number(course.avg_rating).toFixed(1)}
              </span>
              <span className="course-card__dot">·</span>
            </>
          )}
          <span>{(course.total_students ?? 0).toLocaleString()} học viên</span>
        </div>

        <div className="course-card__footer">
          <div className="course-card__price-wrap">
            {isFree ? (
              <span className="course-card__price">Miễn phí</span>
            ) : (
              <>
                <span className="course-card__price">{formatPrice(price, 'VND')}</span>
                {discount > 0 && (
                  <span className="course-card__original">
                    {formatPrice(originalPrice, 'VND')}
                  </span>
                )}
              </>
            )}
          </div>
          <span className="course-card__cta">Xem ngay →</span>
        </div>
      </div>
    </button>
  );
};

export default CourseListCard;