import type React from 'react';
import DOMPurify from 'dompurify';
import type {
  BlockFontFamily,
  BlockFontSize,
  BlockType,
  GutenbergBlock,
} from '../types/cms';

export const BLOCK_FONT_FAMILY_OPTIONS: Array<{
  value: BlockFontFamily;
  label: string;
  css: string;
}> = [
  { value: 'default', label: 'Default Tema', css: '' },
  {
    value: 'sans',
    label: 'Sans-Serif (Plus Jakarta)',
    css: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    value: 'serif',
    label: 'Serif Elegan (Playfair)',
    css: "'Playfair Display', Georgia, serif",
  },
  {
    value: 'mono',
    label: 'Monospace (JetBrains)',
    css: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  },
];

export const BLOCK_FONT_SIZE_OPTIONS: Array<{
  value: BlockFontSize;
  label: string;
  css: string;
}> = [
  { value: 'sm', label: 'Kecil (14px)', css: '0.875rem' },
  { value: 'base', label: 'Normal (16px)', css: '1rem' },
  { value: 'lg', label: 'Sedang (18px)', css: '1.125rem' },
  { value: 'xl', label: 'Besar (22px)', css: '1.375rem' },
  { value: '2xl', label: 'Ekstra Besar (26px)', css: '1.625rem' },
];

export const TEXT_COLOR_PRESETS = [
  { label: 'Hitam Standar', value: '#1d2327' },
  { label: 'Abu Gelap', value: '#50575e' },
  { label: 'Navy HKBP', value: '#0f294a' },
  { label: 'Biru Aksen', value: '#1d4ed8' },
  { label: 'Emas Hangat', value: '#b45309' },
  { label: 'Merah Marun', value: '#991b1b' },
  { label: 'Hijau Zaitun', value: '#166534' },
  { label: 'Ungu Liturgi', value: '#6b21a8' },
];

export const HIGHLIGHT_COLOR_PRESETS = [
  { label: 'Kuning Lembut', value: '#fef08a' },
  { label: 'Biru Muda', value: '#dbeafe' },
  { label: 'Hijau Muda', value: '#dcfce7' },
  { label: 'Persik Hangat', value: '#ffedd5' },
  { label: 'Merah Muda', value: '#fce7f3' },
  { label: 'Abu Terang', value: '#f1f5f9' },
];

export function isSafeHexColor(val: string | undefined): string {
  if (!val) return '';
  const trimmed = val.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : '';
}

export function getBlockTypographyStyle(
  block: Pick<
    GutenbergBlock,
    'align' | 'fontFamily' | 'fontSize' | 'textColor' | 'backgroundColor' | 'type'
  >
): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (block.align) {
    style.textAlign = block.align;
  }
  const ff = BLOCK_FONT_FAMILY_OPTIONS.find((f) => f.value === block.fontFamily);
  if (ff && ff.css) {
    style.fontFamily = ff.css;
  }
  if (block.type !== 'heading') {
    const fs = BLOCK_FONT_SIZE_OPTIONS.find((s) => s.value === block.fontSize);
    if (fs && block.fontSize && block.fontSize !== 'base') {
      style.fontSize = fs.css;
    }
  }
  const color = isSafeHexColor(block.textColor);
  if (color) style.color = color;
  const bg = isSafeHexColor(block.backgroundColor);
  if (bg) style.backgroundColor = bg;
  return style;
}

function buildBlockInlineStyleAttr(
  block: Pick<
    GutenbergBlock,
    'align' | 'fontFamily' | 'fontSize' | 'textColor' | 'backgroundColor' | 'type'
  >
): string {
  const decls: string[] = [];
  if (block.align) {
    decls.push(`text-align:${block.align}`);
  }
  const ff = BLOCK_FONT_FAMILY_OPTIONS.find((f) => f.value === block.fontFamily);
  if (ff && ff.css) {
    decls.push(`font-family:${ff.css}`);
  }
  if (block.type !== 'heading') {
    const fs = BLOCK_FONT_SIZE_OPTIONS.find((s) => s.value === block.fontSize);
    if (fs && block.fontSize && block.fontSize !== 'base') {
      decls.push(`font-size:${fs.css}`);
    }
  }
  const color = isSafeHexColor(block.textColor);
  if (color) decls.push(`color:${color}`);
  const bg = isSafeHexColor(block.backgroundColor);
  if (bg) {
    decls.push(`background-color:${bg}`);
    decls.push('padding:0.75rem 1rem');
    decls.push('border-radius:0.5rem');
  }
  return decls.length > 0 ? ` style="${decls.join(';')}"` : '';
}

export const BLOCK_DEFINITIONS: Array<{
  type: BlockType;
  label: string;
  description: string;
  keywords: string[];
}> = [
  {
    type: 'paragraph',
    label: 'Paragraf',
    description: 'Teks paragraf standar untuk isi artikel.',
    keywords: ['teks', 'paragraph', 'p'],
  },
  {
    type: 'heading',
    label: 'Judul',
    description: 'Subjudul bagian (H2, H3, H4).',
    keywords: ['heading', 'h2', 'h3', 'subjudul'],
  },
  {
    type: 'image',
    label: 'Gambar',
    description: 'Sisipkan gambar dengan keterangan dan teks alt.',
    keywords: ['foto', 'image', 'gambar', 'img'],
  },
  {
    type: 'gallery',
    label: 'Galeri',
    description: 'Tampilkan beberapa foto dalam tata letak grid.',
    keywords: ['album', 'gallery', 'foto'],
  },
  {
    type: 'list',
    label: 'Daftar',
    description: 'Daftar berbutir atau bernomor.',
    keywords: ['list', 'ul', 'ol', 'poin'],
  },
  {
    type: 'quote',
    label: 'Kutipan',
    description: 'Kutipan ayat Alkitab atau perkataan.',
    keywords: ['quote', 'ayat', 'blockquote'],
  },
  {
    type: 'button',
    label: 'Tombol',
    description: 'Tombol ajakan bertindak dengan tautan.',
    keywords: ['button', 'cta', 'link'],
  },
  {
    type: 'columns',
    label: 'Kolom',
    description: 'Susun konten berdampingan dalam 2 atau 3 kolom.',
    keywords: ['columns', 'grid', 'kolom'],
  },
  {
    type: 'youtube',
    label: 'Video / Embed YouTube',
    description: 'Sematkan video rekaman ibadah atau YouTube.',
    keywords: ['video', 'youtube', 'embed'],
  },
  {
    type: 'separator',
    label: 'Pemisah',
    description: 'Garis pemisah antar bagian tulisan.',
    keywords: ['divider', 'hr', 'garis', 'pemisah'],
  },
];

export function createBlock(type: BlockType): GutenbergBlock {
  const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case 'heading':
      return { id, type, content: '', level: 2, align: 'left' };
    case 'image':
      return { id, type, url: '', alt: '', caption: '' };
    case 'gallery':
      return { id, type, gallery: [{ url: '', alt: '', caption: '' }], caption: '' };
    case 'list':
      return { id, type, ordered: false, items: [''] };
    case 'quote':
      return { id, type, content: '', citation: '' };
    case 'button':
      return {
        id,
        type,
        buttonText: 'Selengkapnya',
        buttonUrl: 'https://',
        buttonVariant: 'solid',
        align: 'left',
      };
    case 'columns':
      return {
        id,
        type,
        columnsCount: 2,
        columns: [
          { heading: 'Kolom 1', body: '' },
          { heading: 'Kolom 2', body: '' },
        ],
      };
    case 'youtube':
      return { id, type, url: '', caption: '' };
    case 'separator':
      return { id, type, separatorStyle: 'line' };
    case 'paragraph':
    default:
      return { id, type: 'paragraph', content: '', align: 'left' };
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isSafeHttpOrRelativeUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

export function extractYouTubeId(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeInlineHtml(html: string): string {
  if (!html) return '';
  const normalizedBreaks = html
    .replace(/<\/(p|div)>\s*<(p|div)[^>]*>/gi, '<br />')
    .replace(/<(p|div)[^>]*>/gi, '')
    .replace(/<\/(p|div)>/gi, '');

  return DOMPurify.sanitize(normalizedBreaks, {
    ALLOWED_TAGS: [
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'strike',
      'del',
      'sub',
      'sup',
      'mark',
      'span',
      'a',
      'br',
      'code',
      'font',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'color', 'class'],
  });
}

export function renderRichOrPlainHtml(richHtml?: string, plainText?: string): string {
  if (richHtml !== undefined && richHtml !== null && richHtml !== '') {
    return sanitizeInlineHtml(richHtml);
  }
  return escapeHtml(plainText || '').replace(/\n/g, '<br />');
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof DOMParser !== 'undefined') {
    const withNewlines = html.replace(/<br\s*\/?>/gi, '\n');
    const doc = new DOMParser().parseFromString(withNewlines, 'text/html');
    return (doc.body.textContent || '').replace(/\u00a0/g, ' ');
  }
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'mark', 'u', 's', 'sub', 'sup', 'font'],
    ADD_ATTR: [
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'src',
      'title',
      'target',
      'rel',
      'class',
      'style',
      'color',
    ],
  });
}

export function serializeBlocksToHtml(blocks: GutenbergBlock[]): string {
  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'paragraph': {
        const styleAttr = buildBlockInlineStyleAttr(block);
        const text = renderRichOrPlainHtml(block.contentHtml, block.content);
        return `<p${styleAttr}>${text}</p>`;
      }
      case 'heading': {
        const lvl = block.level || 2;
        const styleAttr = buildBlockInlineStyleAttr(block);
        const text = renderRichOrPlainHtml(block.contentHtml, block.content);
        return `<h${lvl}${styleAttr}>${text}</h${lvl}>`;
      }
      case 'image': {
        const safeUrl = isSafeHttpOrRelativeUrl(block.url);
        if (!safeUrl) return '';
        const alt = escapeHtml(block.alt || '');
        const cap = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : '';
        return `<figure class="wp-block-image"><img src="${escapeHtml(safeUrl)}" alt="${alt}" />${cap}</figure>`;
      }
      case 'gallery': {
        const items = (block.gallery || [])
          .map((item) => {
            const safeUrl = isSafeHttpOrRelativeUrl(item.url);
            if (!safeUrl) return '';
            return `<figure><img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(item.alt || '')}" /></figure>`;
          })
          .filter(Boolean)
          .join('');
        if (!items) return '';
        const cap = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : '';
        return `<div class="wp-block-gallery">${items}${cap}</div>`;
      }
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const styleAttr = buildBlockInlineStyleAttr(block);
        const plainItems = block.items || [];
        const htmlItems = block.itemsHtml || [];
        const count = Math.max(plainItems.length, htmlItems.length);
        const lis: string[] = [];
        for (let i = 0; i < count; i++) {
          const rawPlain = plainItems[i] ?? '';
          const rawHtml = htmlItems[i];
          const textCheck = rawPlain.trim() || htmlToPlainText(rawHtml || '').trim();
          if (!textCheck) continue;
          lis.push(`<li>${renderRichOrPlainHtml(rawHtml, rawPlain)}</li>`);
        }
        return lis.length > 0 ? `<${tag}${styleAttr}>${lis.join('')}</${tag}>` : '';
      }
      case 'quote': {
        const cite = block.citation ? `<cite>${escapeHtml(block.citation)}</cite>` : '';
        const styleAttr = buildBlockInlineStyleAttr(block);
        const text = renderRichOrPlainHtml(block.contentHtml, block.content);
        return `<blockquote${styleAttr}><p>${text}</p>${cite}</blockquote>`;
      }
      case 'button': {
        const safeUrl = isSafeHttpOrRelativeUrl(block.buttonUrl) || '#';
        const align = block.align || 'left';
        const variant = block.buttonVariant || 'solid';
        return `<div class="wp-block-button align-${align}"><a class="wp-btn wp-btn-${variant}" href="${escapeHtml(safeUrl)}">${escapeHtml(block.buttonText || 'Tombol')}</a></div>`;
      }
      case 'columns': {
        const styleAttr = buildBlockInlineStyleAttr(block);
        const cols = (block.columns || [])
          .map((c) => {
            const headingHtml = c.headingHtml || c.heading
              ? `<h4>${renderRichOrPlainHtml(c.headingHtml, c.heading)}</h4>`
              : '';
            const bodyHtml = `<p>${renderRichOrPlainHtml(c.bodyHtml, c.body)}</p>`;
            return `<div class="wp-block-column">${headingHtml}${bodyHtml}</div>`;
          })
          .join('');
        return `<div class="wp-block-columns cols-${block.columnsCount || 2}"${styleAttr}>${cols}</div>`;
      }
      case 'youtube': {
        const ytId = extractYouTubeId(block.url);
        if (!ytId) return '';
        const cap = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : '';
        return `<figure class="wp-block-embed"><iframe src="https://www.youtube.com/embed/${ytId}" title="Video YouTube" frameborder="0" allowfullscreen></iframe>${cap}</figure>`;
      }
      case 'separator':
        return `<hr class="wp-block-separator is-style-${block.separatorStyle || 'line'}" />`;
      default:
        return '';
    }
  });

  return sanitizeHtml(parts.filter(Boolean).join('\n'));
}

export function extractPlainExcerpt(blocks: GutenbergBlock[], maxLength = 150): string {
  const texts: string[] = [];
  for (const b of blocks) {
    if (b.content) texts.push(b.content);
    else if (b.contentHtml) texts.push(htmlToPlainText(b.contentHtml));
    if (b.items) texts.push(b.items.join(' '));
    if (b.columns) texts.push(b.columns.map((c) => `${c.heading || ''} ${c.body}`).join(' '));
  }
  const combined = texts.join(' ').replace(/\s+/g, ' ').trim();
  if (combined.length <= maxLength) return combined;
  return `${combined.slice(0, maxLength).trim()}…`;
}
