'use client';
import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <IconButton icon={theme === 'dark' ? Sun : Moon} onClick={toggle} />;
}
