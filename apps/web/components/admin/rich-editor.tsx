'use client';

import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useState } from 'react';
import { MediaPicker } from './media-picker';
import { btnGhost } from './ui';

const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') ?? 'center',
        renderHTML: (attributes) => ({ 'data-align': attributes.alignment }),
      },
      size: {
        default: 'large',
        parseHTML: (element) => element.getAttribute('data-size') ?? 'large',
        renderHTML: (attributes) => ({ 'data-size': attributes.size }),
      },
    };
  },
});

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [image, setImage] = useState({ selected: false, alignment: 'center', size: 'large' });
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Link.configure({ openOnClick: false, protocols: ['https', 'http', 'mailto'] }),
      ArticleImage,
      Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
    ],
    content: value,
    editorProps: { attributes: { class: 'article-body min-h-[22rem] rounded-b-md border border-line bg-surface p-4 focus:outline-none', 'aria-label': 'Article body' } },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onSelectionUpdate: ({ editor: e }) => {
      const selected = e.isActive('image');
      const attrs = e.getAttributes('image');
      setImage({
        selected,
        alignment: attrs.alignment ?? 'center',
        size: attrs.size ?? 'large',
      });
    },
  });
  if (!editor) return <div className="h-96 animate-pulse rounded-md bg-line" />;

  const b = (label: string, run: () => void, active = false) => (
    <button key={label} type="button" onClick={run} aria-pressed={active} className={`${btnGhost} ${active ? 'bg-bg ring-1 ring-accent' : ''}`}>{label}</button>
  );
  const c = () => editor.chain().focus();

  function setLink() {
    const url = window.prompt('Link address (https://…)', editor!.getAttributes('link').href ?? '');
    if (url === null) return;
    if (url === '') { c().unsetLink().run(); return; }
    if (!/^(https?:\/\/|mailto:)/i.test(url)) { window.alert('Use a link starting with https://'); return; }
    c().setLink({ href: url }).run();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-line bg-bg p-2" role="toolbar" aria-label="Formatting">
        <select aria-label="Block type" className="rounded-md border border-line bg-surface px-2 text-sm"
          value={[1,2,3,4,5,6].find((l) => editor.isActive('heading', { level: l }))?.toString() ?? 'p'}
          onChange={(e) => (e.target.value === 'p' ? c().setParagraph().run() : c().toggleHeading({ level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 }).run())}>
          <option value="p">Paragraph</option>{[1,2,3,4,5,6].map((l) => <option key={l} value={l}>Heading {l}</option>)}
        </select>
        {b('Bold', () => c().toggleBold().run(), editor.isActive('bold'))}
        {b('Italic', () => c().toggleItalic().run(), editor.isActive('italic'))}
        {b('Bullets', () => c().toggleBulletList().run(), editor.isActive('bulletList'))}
        {b('Numbers', () => c().toggleOrderedList().run(), editor.isActive('orderedList'))}
        {b('Quote', () => c().toggleBlockquote().run(), editor.isActive('blockquote'))}
        {b('Code', () => c().toggleCodeBlock().run(), editor.isActive('codeBlock'))}
        {b('Link', setLink, editor.isActive('link'))}
        <MediaPicker triggerLabel="Image" onSelect={({ url, alt }) => c().setImage({ src: url, alt }).run()} />
        <select
          aria-label="Image alignment"
          className="rounded-md border border-line bg-surface px-2 text-sm"
          disabled={!image.selected}
          value={image.alignment}
          onChange={(e) => {
            const alignment = e.target.value;
            c().updateAttributes('image', { alignment }).run();
            setImage((current) => ({ ...current, alignment }));
          }}
        >
          <option value="left">Image left</option><option value="center">Image center</option><option value="right">Image right</option>
        </select>
        <select
          aria-label="Image size"
          className="rounded-md border border-line bg-surface px-2 text-sm"
          disabled={!image.selected}
          value={image.size}
          onChange={(e) => {
            const size = e.target.value;
            c().updateAttributes('image', { size }).run();
            setImage((current) => ({ ...current, size }));
          }}
        >
          <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
        </select>
        {b('Table', () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
        {b('Divider', () => c().setHorizontalRule().run())}
        {b('Undo', () => c().undo().run())}
        {b('Redo', () => c().redo().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
