import React from 'react';

interface TreeNode {
  label: string;
  children?: TreeNode[];
}

const PLACEHOLDER_TREE: TreeNode[] = [
  {
    label: 'Workspace',
    children: [
      { label: 'Daily Briefings' },
      { label: 'Meeting Prep' },
      { label: 'Follow-ups' },
      { label: 'Artifacts' },
    ],
  },
];

function TreeFolder({ node, depth = 0 }: { node: TreeNode; depth?: number }): React.ReactElement {
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left py-1 px-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/50 rounded transition-colors"
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {hasChildren ? (
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="truncate">{node.label}</span>
      </button>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) =>
            child.children ? (
              <TreeFolder key={child.label} node={child} depth={depth + 1} />
            ) : (
              <TreeNodeItem key={child.label} node={child} depth={depth + 1} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function TreeNodeItem({ node, depth }: { node: TreeNode; depth: number }): React.ReactElement {
  return (
    <div
      className="flex items-center gap-1.5 py-1 px-1.5 text-xs text-text-tertiary cursor-default"
      style={{ paddingLeft: `${depth * 12 + 6}px` }}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <span className="truncate">{node.label}</span>
    </div>
  );
}

export function NotesSidePanel(): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-default">
        <h2 className="section-heading">Explorer</h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {PLACEHOLDER_TREE.map((node) => (
          <TreeFolder key={node.label} node={node} />
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border-default">
        <p className="text-[10px] text-text-tertiary">Notes coming soon</p>
      </div>
    </div>
  );
}
