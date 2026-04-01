import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { parseFrontmatter, serializeWithFrontmatter } from './markdown-serializer.js';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function getMarkdown(ed: Editor): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const md = (ed.storage as any).markdown;
  return md?.getMarkdown?.() ?? '';
}

interface TiptapEditorProps {
  rawContent: string;
  onContentChange: (markdown: string) => void;
  saveState: SaveState;
}

const SAVE_DEBOUNCE_MS = 1000;

const SAVE_STATE_LABELS: Record<SaveState, string | null> = {
  idle: null,
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed',
};

export function TiptapEditor({ rawContent, onContentChange, saveState }: TiptapEditorProps): React.ReactElement {
  const frontmatterRef = React.useRef<string | null>(null);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExternalUpdateRef = React.useRef(false);

  const parsed = React.useMemo(() => parseFrontmatter(rawContent), [rawContent]);
  frontmatterRef.current = parsed.frontmatter;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: {
          HTMLAttributes: { class: 'tiptap-code-block' },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: parsed.body,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-body',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isExternalUpdateRef.current) {
        isExternalUpdateRef.current = false;
        return;
      }
      const body = getMarkdown(ed);
      const full = serializeWithFrontmatter(frontmatterRef.current, body);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        onContentChange(full);
      }, SAVE_DEBOUNCE_MS);
    },
  });

  React.useEffect(() => {
    if (!editor) return;

    const currentBody = getMarkdown(editor);
    if (currentBody !== parsed.body) {
      isExternalUpdateRef.current = true;
      editor.commands.setContent(parsed.body);
    }
  }, [parsed.body, editor]);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const saveLabel = SAVE_STATE_LABELS[saveState];

  return (
    <div className="tiptap-editor-wrapper">
      {parsed.frontmatter && (
        <div className="tiptap-frontmatter" data-testid="frontmatter-block">
          <pre className="tiptap-frontmatter-content">{parsed.frontmatter}</pre>
        </div>
      )}
      <div className="tiptap-save-indicator">
        {saveLabel && <span className={`tiptap-save-${saveState}`}>{saveLabel}</span>}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
