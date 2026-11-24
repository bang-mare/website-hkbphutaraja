import DOMPurify from 'dompurify';
import type { BlockType, GutenbergBlock } from '../types/cms';

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
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
    ],
  });
}

export function serializeBlocksToHtml(blocks: GutenbergBlock[]): string {
  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'paragraph': {
        const align = block.align ? ` style="text-align:${block.align}"` : '';
        const text = escapeHtml(block.content || '').replace(/\n/g, '<br />');
        return `<p${align}>${text}</p>`;
      }
      case 'heading': {
        const lvl = block.level || 2;
        const align = block.align ? ` style="text-align:${block.align}"` : '';
        return `<h${lvl}${align}>${escapeHtml(block.content || '')}</h${lvl}>`;
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
        const lis = (block.items || [])
          .filter((i) => i.trim() !== '')
          .map((i) => `<li>${escapeHtml(i)}</li>`)
          .join('');
        return lis ? `<${tag}>${lis}</${tag}>` : '';
      }
      case 'quote': {
        const cite = block.citation ? `<cite>${escapeHtml(block.citation)}</cite>` : '';
        return `<blockquote><p>${escapeHtml(block.content || '').replace(/\n/g, '<br />')}</p>${cite}</blockquote>`;
      }
      case 'button': {
        const safeUrl = isSafeHttpOrRelativeUrl(block.buttonUrl) || '#';
        const align = block.align || 'left';
        const variant = block.buttonVariant || 'solid';
        return `<div class="wp-block-button align-${align}"><a class="wp-btn wp-btn-${variant}" href="${escapeHtml(safeUrl)}">${escapeHtml(block.buttonText || 'Tombol')}</a></div>`;
      }
      case 'columns': {
        const cols = (block.columns || [])
          .map(
            (c) =>
              `<div class="wp-block-column">${c.heading ? `<h4>${escapeHtml(c.heading)}</h4>` : ''}<p>${escapeHtml(c.body || '').replace(/\n/g, '<br />')}</p></div>`
          )
          .join('');
        return `<div class="wp-block-columns cols-${block.columnsCount || 2}">${cols}</div>`;
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
    if (b.items) texts.push(b.items.join(' '));
    if (b.columns) texts.push(b.columns.map((c) => `${c.heading || ''} ${c.body}`).join(' '));
  }
  const combined = texts.join(' ').replace(/\s+/g, ' ').trim();
  if (combined.length <= maxLength) return combined;
  return `${combined.slice(0, maxLength).trim()}…`;
}
