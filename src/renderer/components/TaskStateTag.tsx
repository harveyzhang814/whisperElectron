import React from 'react';

export const TaskStateTag: React.FC<{ state: string }> = ({ state }) => {
  const stateMap: Record<string, { label: string; className: string }> = {
    CREATED:   { label: '待录音',   className: 'tag-created' },
    RUNNING:   { label: '录音中',   className: 'tag-running' },
    COMPLETED: { label: '已完成',   className: 'tag-completed' },
    CANCELLED: { label: '已取消',   className: 'tag-cancelled' },
    FAILED:    { label: '失败',     className: 'tag-failed' },
  };
  const { label, className } = stateMap[state] || { label: state, className: 'tag-unknown' };
  return <span className={`task-state-tag ${className}`}>{label}</span>;
}; 