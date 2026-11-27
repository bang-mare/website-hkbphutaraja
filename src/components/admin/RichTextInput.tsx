import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  escapeHtml,
  htmlToPlainText,
  isSafeHttpOrRelativeUrl,
  renderRichOrPlainHtml,
  sanitizeInlineHtml,
} from '../../lib/blocks';

export interface ActiveInlineFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  subscript: boolean;
  superscript: boolean;
  link: boolean;
}

export interface RichTextEditorHandle {
  focusAndRestoreSelection: () => boolean;
  execCommand: (command: string, value?: string) => void;
  applyColor: (kind: 'foreColor' | 'hiliteColor', hex: string) => void;
  toggleInlineCode: () => void;
  insertLink: (url: string) => void;
  unlink: () => void;
  clearFormatting: () => void;
  getActiveFormats: () => ActiveInlineFormats;
}

interface RichTextInputProps {
  html?: string;
  plainText?: string;
  placeholder?: string;
  multiline?: boolean;
  onEnter?: () => void;
  onChange: (nextHtml: string, nextPlainText: string) => void;
  onFocusEditor?: (handle: RichTextEditorHandle) => void;
  onSelectionStateChange?: () => void;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

const EMPTY_FORMATS: ActiveInlineFormats = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  subscript: false,
  superscript: false,
  link: false,
};

export const RichTextInput = React.forwardRef<RichTextEditorHandle, RichTextInputProps>(
  function RichTextInput(
    {
      html,
      plainText,
      placeholder = '',
      multiline = false,
      onEnter,
      onChange,
      onFocusEditor,
      onSelectionStateChange,
      className = '',
      style,
      ariaLabel,
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const lastSyncedHtmlRef = useRef<string | null>(null);
    const savedRangeRef = useRef<Range | null>(null);

    const resolveTargetHtml = useCallback(() => {
      if (html !== undefined && html !== null && html !== '') {
        return sanitizeInlineHtml(html);
      }
      if (plainText) {
        return escapeHtml(plainText).replace(/\n/g, '<br />');
      }
      return '';
    }, [html, plainText]);

    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      const target = resolveTargetHtml();
      if (target !== lastSyncedHtmlRef.current) {
        el.innerHTML = target;
        lastSyncedHtmlRef.current = target;
      }
    }, [resolveTargetHtml]);

    const captureSelection = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }, []);

    const focusAndRestoreSelection = useCallback((): boolean => {
      const el = editorRef.current;
      if (!el) return false;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return false;

      if (
        savedRangeRef.current &&
        el.contains(savedRangeRef.current.commonAncestorContainer)
      ) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
        return true;
      }

      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
      return true;
    }, []);

    const emitCurrentContent = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const rawHtml = el.innerHTML;
      const plain = htmlToPlainText(rawHtml);
      const isEffectivelyEmpty =
        plain.replace(/\s+/g, '').trim() === '' && !rawHtml.includes('<img');

      const nextHtml = isEffectivelyEmpty ? '' : sanitizeInlineHtml(rawHtml);
      const nextPlain = isEffectivelyEmpty ? '' : plain;

      if (isEffectivelyEmpty && el.innerHTML !== '') {
        el.innerHTML = '';
      }

      lastSyncedHtmlRef.current = nextHtml;
      onChange(nextHtml, nextPlain);
      captureSelection();
      onSelectionStateChange?.();
    }, [captureSelection, onChange, onSelectionStateChange]);

    const getActiveFormats = useCallback((): ActiveInlineFormats => {
      const el = editorRef.current;
      if (!el) return EMPTY_FORMATS;
      const sel = window.getSelection();
      const hasSelInside =
        Boolean(sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer));

      if (!hasSelInside && document.activeElement !== el) {
        return EMPTY_FORMATS;
      }

      let inLink = false;
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
        while (node && node !== el) {
          if (node.nodeName === 'A') {
            inLink = true;
            break;
          }
          node = node.parentNode;
        }
      }

      try {
        return {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          subscript: document.queryCommandState('subscript'),
          superscript: document.queryCommandState('superscript'),
          link: inLink,
        };
      } catch {
        return EMPTY_FORMATS;
      }
    }, []);

    const execCommand = useCallback(
      (command: string, value?: string) => {
        if (!focusAndRestoreSelection()) return;
        try {
          document.execCommand('styleWithCSS', false, 'false');
          document.execCommand(command, false, value);
        } catch {
          // Ignore unsupported browser command
        }
        emitCurrentContent();
      },
      [emitCurrentContent, focusAndRestoreSelection]
    );

    const applyColor = useCallback(
      (kind: 'foreColor' | 'hiliteColor', hex: string) => {
        if (!focusAndRestoreSelection()) return;
        try {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand(kind, false, hex);
          document.execCommand('styleWithCSS', false, 'false');
        } catch {
          // Fallback without styleWithCSS
          try {
            document.execCommand(kind, false, hex);
          } catch {
            // Ignore
          }
        }
        emitCurrentContent();
      },
      [emitCurrentContent, focusAndRestoreSelection]
    );

    const toggleInlineCode = useCallback(() => {
      const el = editorRef.current;
      if (!el || !focusAndRestoreSelection()) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);

      let ancestor: Node | null = range.commonAncestorContainer;
      let existingCode: HTMLElement | null = null;
      while (ancestor && ancestor !== el) {
        if (ancestor.nodeName === 'CODE') {
          existingCode = ancestor as HTMLElement;
          break;
        }
        ancestor = ancestor.parentNode;
      }

      if (existingCode) {
        const textNode = document.createTextNode(existingCode.textContent || '');
        existingCode.replaceWith(textNode);
        const newRange = document.createRange();
        newRange.selectNodeContents(textNode);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } else if (!range.collapsed) {
        const codeEl = document.createElement('code');
        codeEl.textContent = range.toString();
        range.deleteContents();
        range.insertNode(codeEl);
        const newRange = document.createRange();
        newRange.selectNodeContents(codeEl);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      emitCurrentContent();
    }, [emitCurrentContent, focusAndRestoreSelection]);

    const insertLink = useCallback(
      (url: string) => {
        const safeUrl = isSafeHttpOrRelativeUrl(url);
        if (!safeUrl || !focusAndRestoreSelection()) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);

        if (range.collapsed) {
          const anchor = document.createElement('a');
          anchor.href = safeUrl;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.textContent = safeUrl;
          range.insertNode(anchor);
          const after = document.createRange();
          after.setStartAfter(anchor);
          after.collapse(true);
          sel.removeAllRanges();
          sel.addRange(after);
        } else {
          document.execCommand('createLink', false, safeUrl);
          const el = editorRef.current;
          if (el) {
            el.querySelectorAll('a').forEach((a) => {
              if (a.getAttribute('href') === safeUrl) {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
              }
            });
          }
        }
        emitCurrentContent();
      },
      [emitCurrentContent, focusAndRestoreSelection]
    );

    const unlink = useCallback(() => {
      if (!focusAndRestoreSelection()) return;
      document.execCommand('unlink', false);
      emitCurrentContent();
    }, [emitCurrentContent, focusAndRestoreSelection]);

    const clearFormatting = useCallback(() => {
      const el = editorRef.current;
      if (!el || !focusAndRestoreSelection()) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
        const cleanText = htmlToPlainText(el.innerHTML);
        el.innerHTML = renderRichOrPlainHtml(undefined, cleanText);
      } else {
        document.execCommand('removeFormat', false);
        document.execCommand('unlink', false);
      }
      emitCurrentContent();
    }, [emitCurrentContent, focusAndRestoreSelection]);

    const handleApi: RichTextEditorHandle = {
      focusAndRestoreSelection,
      execCommand,
      applyColor,
      toggleInlineCode,
      insertLink,
      unlink,
      clearFormatting,
      getActiveFormats,
    };

    const handleRef = useRef<RichTextEditorHandle>(handleApi);
    handleRef.current = handleApi;

    useImperativeHandle(ref, () => ({
      focusAndRestoreSelection: () => handleRef.current.focusAndRestoreSelection(),
      execCommand: (cmd, val) => handleRef.current.execCommand(cmd, val),
      applyColor: (kind, hex) => handleRef.current.applyColor(kind, hex),
      toggleInlineCode: () => handleRef.current.toggleInlineCode(),
      insertLink: (url) => handleRef.current.insertLink(url),
      unlink: () => handleRef.current.unlink(),
      clearFormatting: () => handleRef.current.clearFormatting(),
      getActiveFormats: () => handleRef.current.getActiveFormats(),
    }));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        if (!multiline) {
          e.preventDefault();
          onEnter?.();
          return;
        }
        e.preventDefault();
        const inserted = document.execCommand('insertLineBreak');
        if (!inserted) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const br = document.createElement('br');
            range.insertNode(br);
            const next = document.createRange();
            next.setStartAfter(br);
            next.collapse(true);
            sel.removeAllRanges();
            sel.addRange(next);
          }
        }
        emitCurrentContent();
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const htmlData = e.clipboardData.getData('text/html');
      const textData = e.clipboardData.getData('text/plain');

      const safeFragment = htmlData
        ? sanitizeInlineHtml(htmlData)
        : escapeHtml(textData).replace(/\r?\n/g, '<br />');

      document.execCommand('insertHTML', false, safeFragment);
      emitCurrentContent();
    };

    return (
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={multiline}
        aria-label={ariaLabel || placeholder}
        data-placeholder={placeholder}
        onFocus={() => {
          captureSelection();
          onFocusEditor?.(handleRef.current);
          onSelectionStateChange?.();
        }}
        onBlur={() => {
          captureSelection();
        }}
        onInput={emitCurrentContent}
        onKeyUp={() => {
          captureSelection();
          onSelectionStateChange?.();
        }}
        onMouseUp={() => {
          captureSelection();
          onSelectionStateChange?.();
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        style={style}
        className={`hkbp-rich-input focus:outline-none ${className}`}
      />
    );
  }
);
