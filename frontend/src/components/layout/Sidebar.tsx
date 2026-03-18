// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import type { Section, Lesson } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  sections: Section[];
  activeLessonId: string;
  completedLessons: string[];
  onSelectLesson: (lessonId: string) => void;
  courseProgress: number;
}

const LessonIcon: React.FC<{ type: Lesson['type']; isCompleted: boolean }> = ({ type, isCompleted }) => {
  if (isCompleted) return <span className="lesson-icon lesson-icon--done">✓</span>;
  const icons: Record<Lesson['type'], string> = {
    video:   '▶',
    quiz:    '?',
    article: '📄',
    project: '⚙',
  };
  return <span className="lesson-icon">{icons[type]}</span>;
};

const Sidebar: React.FC<SidebarProps> = ({
  sections,
  activeLessonId,
  completedLessons,
  onSelectLesson,
  courseProgress,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([sections[0]?.id]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);

  return (
    <aside className="sidebar">
      {/* Progress header */}
      <div className="sidebar__header">
        <div className="sidebar__progress-text">
          <span>Tiến độ</span>
          <strong>{courseProgress}%</strong>
        </div>
        <div className="sidebar__progress-bar">
          <div
            className="sidebar__progress-fill"
            style={{ width: `${courseProgress}%` }}
            role="progressbar"
            aria-valuenow={courseProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="sidebar__progress-sub">
          {completedLessons.length}/{totalLessons} bài học hoàn thành
        </p>
      </div>

      {/* Curriculum */}
      <div className="sidebar__curriculum">
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections.includes(section.id);
          const sectionCompleted = section.lessons.filter(l => completedLessons.includes(l.id)).length;

          return (
            <div key={section.id} className="sidebar__section">
              <button
                className={`sidebar__section-header ${isExpanded ? 'sidebar__section-header--open' : ''}`}
                onClick={() => toggleSection(section.id)}
                aria-expanded={isExpanded}
              >
                <span className="sidebar__section-num">
                  Phần {sIdx + 1}
                </span>
                <span className="sidebar__section-title">{section.title}</span>
                <span className="sidebar__section-meta">
                  {sectionCompleted}/{section.lessons.length}
                </span>
                <span className="sidebar__chevron">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <ul className="sidebar__lessons">
                  {section.lessons.map(lesson => {
                    const isActive    = lesson.id === activeLessonId;
                    const isDone      = completedLessons.includes(lesson.id);

                    return (
                      <li key={lesson.id}>
                        <button
                          className={`sidebar__lesson ${isActive ? 'sidebar__lesson--active' : ''} ${isDone ? 'sidebar__lesson--done' : ''}`}
                          onClick={() => onSelectLesson(lesson.id)}
                        >
                          <LessonIcon type={lesson.type} isCompleted={isDone} />
                          <span className="sidebar__lesson-title">{lesson.title}</span>
                          <span className="sidebar__lesson-duration">{lesson.duration}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
