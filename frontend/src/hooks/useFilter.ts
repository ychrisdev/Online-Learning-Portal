// src/hooks/useFilter.ts
import { useState, useMemo } from 'react';
import type { Course, FilterState } from '../types';

const initialFilter: FilterState = {
  category: '',
  level: '',
  priceRange: 'all',
  rating: 0,
  search: '',
};

export const useFilter = (courses: Course[]) => {
  const [filter, setFilter] = useState<FilterState>(initialFilter);

  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const match =
          c.title.toLowerCase().includes(q) ||
          c.shortDescription.toLowerCase().includes(q) ||
          c.instructor.name.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filter.category && c.category !== filter.category) return false;
      if (filter.level    && c.level    !== filter.level)    return false;
      if (filter.rating   && c.rating   < filter.rating)     return false;
      if (filter.priceRange === 'free' && c.price !== 0)      return false;
      if (filter.priceRange === 'paid' && c.price === 0)      return false;
      return true;
    });
  }, [courses, filter]);

  const updateFilter = (key: keyof FilterState, value: string | number) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const resetFilter = () => setFilter(initialFilter);

  return { filter, filtered, updateFilter, resetFilter };
};

// src/hooks/useLocalStorage.ts — kept in same file for brevity
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('localStorage error:', err);
    }
  };

  return [storedValue, setValue] as const;
};
