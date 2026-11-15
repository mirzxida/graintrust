'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  activeValue: string;
  setActiveValue: (val: string) => void;
  tabIds: React.MutableRefObject<Map<string, string>>;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string;
  onValueChange: (val: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const tabIds = React.useRef(new Map<string, string>());

  return (
    <TabsContext.Provider
      value={{ activeValue: value, setActiveValue: onValueChange, tabIds }}
    >
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex !== -1) {
      e.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-1 overflow-x-auto border-b border-slate-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used inside Tabs');

  const reactId = React.useId();
  const id = `tab-${reactId}`;
  ctx.tabIds.current.set(value, id);

  const isSelected = ctx.activeValue === value;

  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => ctx.setActiveValue(value)}
      className={cn(
        'gt-tab flex-none min-h-10 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap transition-colors',
        isSelected && 'text-blue-700',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used inside Tabs');

  const isSelected = ctx.activeValue === value;
  const tabId = ctx.tabIds.current.get(value);

  return (
    <div
      role="tabpanel"
      aria-labelledby={tabId}
      hidden={!isSelected}
      tabIndex={isSelected ? 0 : undefined}
      className={cn('pt-4', className)}
    >
      {isSelected ? children : null}
    </div>
  );
}
