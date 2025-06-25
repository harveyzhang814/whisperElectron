import React from 'react';

export const TaskStateTag: React.FC<{ state: string }> = ({ state }) => {
  const stateMap: Record<string, { label: string; className: string }> = {
    PENDING:   { label: '待处理',   className: 'tag-pending' },
    RUNNING:   { label: '进行中',   className: 'tag-running' },
    COMPLETED: { label: '已完成',   className: 'tag-completed' },
    CANCELLED: { label: '已取消',   className: 'tag-cancelled' },
    FAILED:    { label: '失败',     className: 'tag-failed' },
    // Legacy states for backward compatibility
    CREATED:   { label: '待处理',   className: 'tag-pending' },
  };
  const { label, className } = stateMap[state] || { label: state, className: 'tag-unknown' };
  return <span className={`task-state-tag ${className}`}>{label}</span>;
}; 