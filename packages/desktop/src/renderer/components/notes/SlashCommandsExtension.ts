import {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { TransactionSpec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Slash command definitions for markdown insertion.
 */
interface SlashCommand {
  label: string;
  detail: string;
  markdown: string;
  cursorOffset?: number; // Where to place cursor after insertion (default: end of markdown)
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    label: 'heading1',
    detail: 'Heading 1',
    markdown: '# ',
    cursorOffset: 2,
  },
  {
    label: 'heading2',
    detail: 'Heading 2',
    markdown: '## ',
    cursorOffset: 3,
  },
  {
    label: 'heading3',
    detail: 'Heading 3',
    markdown: '### ',
    cursorOffset: 4,
  },
  {
    label: 'heading4',
    detail: 'Heading 4',
    markdown: '#### ',
    cursorOffset: 5,
  },
  {
    label: 'heading5',
    detail: 'Heading 5',
    markdown: '##### ',
    cursorOffset: 6,
  },
  {
    label: 'heading6',
    detail: 'Heading 6',
    markdown: '###### ',
    cursorOffset: 7,
  },
  {
    label: 'bullet',
    detail: 'Bullet list',
    markdown: '- ',
    cursorOffset: 2,
  },
  {
    label: 'number',
    detail: 'Numbered list',
    markdown: '1. ',
    cursorOffset: 3,
  },
  {
    label: 'todo',
    detail: 'To-do list',
    markdown: '- [ ] ',
    cursorOffset: 6,
  },
  {
    label: 'quote',
    detail: 'Quote',
    markdown: '> ',
    cursorOffset: 2,
  },
  {
    label: 'code',
    detail: 'Code block',
    markdown: '```\n\n```',
    cursorOffset: 4, // Place cursor between the fences
  },
  {
    label: 'callout',
    detail: 'Callout',
    markdown: '> [!note] \n',
    cursorOffset: 10, // Place cursor after the callout type
  },
  {
    label: 'divider',
    detail: 'Horizontal divider',
    markdown: '\n---\n',
    cursorOffset: 5,
  },
  {
    label: 'bold',
    detail: 'Bold text',
    markdown: '**bold text**',
    cursorOffset: 2, // Cursor after first **, inside the text
  },
  {
    label: 'italic',
    detail: 'Italic text',
    markdown: '*italic text*',
    cursorOffset: 1, // Cursor after first *, inside the text
  },
  {
    label: 'strikethrough',
    detail: 'Strikethrough text',
    markdown: '~~text~~',
    cursorOffset: 2, // Cursor after first ~~, inside the text
  },
  {
    label: 'link',
    detail: 'Link',
    markdown: '[link text](url)',
    cursorOffset: 12, // Cursor on 'url'
  },
  {
    label: 'image',
    detail: 'Image',
    markdown: '![alt text](url)',
    cursorOffset: 12, // Cursor on 'url'
  },
  {
    label: 'code-inline',
    detail: 'Inline code',
    markdown: '`code`',
    cursorOffset: 1, // Cursor inside the backticks
  },
  {
    label: 'done',
    detail: 'Toggle checkbox (checked)',
    markdown: '- [x] ',
    cursorOffset: 6,
  },
  {
    label: 'table',
    detail: 'Table',
    markdown: '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |\n',
    cursorOffset: 2, // Place cursor at start of first cell
  },
];

/**
 * Check if slash command autocomplete should be triggered.
 * Only trigger at start of line or after whitespace, and not inside code blocks.
 */
function shouldTriggerSlashCommand(context: CompletionContext, slashFrom: number): boolean {
  const { state, pos } = context;

  // Check if we're inside a code block or fenced code
  const tree = syntaxTree(state);
  let inCodeBlock = false;

  tree.iterate({
    enter: (node) => {
      if (node.from <= pos && node.to >= pos) {
        if (node.name === 'CodeBlock' || node.name === 'FencedCode') {
          inCodeBlock = true;
          return false; // Stop iteration
        }
      }
      return true;
    },
  });

  if (inCodeBlock) {
    return false;
  }

  // Check if the "/" is at the start of a line or after whitespace
  const line = state.doc.lineAt(slashFrom);
  const textBeforeSlash = state.doc.sliceString(line.from, slashFrom);

  // Allow if at start of line or if only whitespace precedes
  return textBeforeSlash === '' || /^\s*$/.test(textBeforeSlash);
}

/**
 * Completion source for slash commands.
 */
export const slashCommandSource: CompletionSource = (context: CompletionContext): CompletionResult | null => {
  // Check if we're typing "/"
  const word = context.matchBefore(/\/[a-z]*$/);

  if (!word) {
    return null;
  }

  // Check if slash command should be triggered
  if (!shouldTriggerSlashCommand(context, word.from)) {
    return null;
  }

  // Filter commands based on what's typed after "/"
  const query = word.text.slice(1); // Remove the leading "/"
  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().startsWith(query.toLowerCase())
  );

  if (filteredCommands.length === 0) {
    return null;
  }

  const completions: Completion[] = filteredCommands.map((cmd) => ({
    label: `/${cmd.label}`, // Include slash prefix so CodeMirror filtering works correctly
    detail: cmd.detail,
    apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
      const cursorOffset = cmd.cursorOffset ?? cmd.markdown.length;

      // Replace the slash token and any following letters, preserving leading indentation
      const transaction: TransactionSpec = {
        changes: { from, to, insert: cmd.markdown },
        selection: { anchor: from + cursorOffset },
      };

      view.dispatch(transaction);
    },
    info: (_completion: Completion) => {
      // Show markdown preview in completion info
      const div = document.createElement('div');
      div.className = 'cm-completion-info';
      div.textContent = `Inserts: ${_completion.detail}`;
      return div;
    },
  }));

  return {
    from: word.from,
    to: word.to,
    options: completions,
    validFor: /^\/[a-z]*$/, // Valid while typing letters after "/"
  };
};

/**
 * CSS styles for autocomplete completion menu.
 * Note: Dark mode styles are in styles.css at global level
 */
export const slashCommandsStyles = EditorView.baseTheme({
  '.cm-tooltip-autocomplete': {
    fontFamily: 'Barlow, ui-sans-serif, system-ui, sans-serif',
  },
  '.cm-tooltip-autocomplete ul': {
    margin: '0',
    padding: '0',
    listStyle: 'none',
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none',
  },
});
