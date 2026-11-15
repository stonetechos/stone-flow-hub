/**
 * Stone Tech OS — Universal Indic DOM Auto-Translator
 *
 * Automatically translates all DOM text nodes, input placeholders, aria-labels,
 * and titles whenever the app language is 'hi' (Hindi) or 'gu' (Gujarati).
 *
 * Guarantees that:
 * 1. Radix UI portals, dialogs, dropdowns, and tooltips are automatically translated.
 * 2. Inputs and Textareas have their English placeholders translated.
 * 3. Any future feature or screen written in English is translated at runtime by the software itself.
 * 4. Switching back to English restores the exact original English strings losslessly.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { autoTranslate, getActiveLanguage } from "./auto-translator";

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (
    tag === "SCRIPT" ||
    tag === "STYLE" ||
    tag === "NOSCRIPT" ||
    tag === "CODE" ||
    tag === "PRE"
  ) {
    return true;
  }
  if (el.closest('[data-no-translate], [translate="no"], .notranslate, pre, code')) {
    return true;
  }
  return false;
}

function revertDocumentToEnglish() {
  if (typeof document === "undefined") return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textNode: Text | null = walker.nextNode() as Text | null;
  while (textNode) {
    const orig = (textNode as unknown as { __origStosEnglish?: string }).__origStosEnglish;
    if (orig) {
      textNode.nodeValue = orig;
      delete (textNode as unknown as { __origStosEnglish?: string }).__origStosEnglish;
    }
    textNode = walker.nextNode() as Text | null;
  }

  const inputs = document.querySelectorAll("input[data-orig-stos-ph], textarea[data-orig-stos-ph]");
  inputs.forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    if (input.dataset.origStosPh) {
      input.placeholder = input.dataset.origStosPh;
      delete input.dataset.origStosPh;
    }
  });

  const titled = document.querySelectorAll("[data-orig-stos-title]");
  titled.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.dataset.origStosTitle) {
      htmlEl.setAttribute("title", htmlEl.dataset.origStosTitle);
      delete htmlEl.dataset.origStosTitle;
    }
  });

  const ariaLabeled = document.querySelectorAll("[data-orig-stos-aria]");
  ariaLabeled.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.dataset.origStosAria) {
      htmlEl.setAttribute("aria-label", htmlEl.dataset.origStosAria);
      delete htmlEl.dataset.origStosAria;
    }
  });
}

export function useIndicDomAutoTranslator() {
  const { i18n } = useTranslation();
  const lang = i18n.language || getActiveLanguage();

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    if (lang === "en" || lang.startsWith("en")) {
      revertDocumentToEnglish();
      return;
    }

    let isTranslating = false;
    let scheduledFrame: number | null = null;
    const pendingNodes = new Set<Node>();

    const processTextNode = (textNode: Text) => {
      const customNode = textNode as unknown as { __origStosEnglish?: string };
      const currentVal = textNode.nodeValue || "";
      const sourceText = customNode.__origStosEnglish || currentVal;
      if (!sourceText || !/[a-zA-Z]/.test(sourceText)) return;
      if (shouldSkipElement(textNode.parentElement)) return;

      const translated = autoTranslate(sourceText, lang);
      if (translated && translated !== currentVal) {
        if (!customNode.__origStosEnglish) {
          customNode.__origStosEnglish = sourceText;
        }
        isTranslating = true;
        try {
          textNode.nodeValue = translated;
        } finally {
          isTranslating = false;
        }
      }
    };

    const processElementAttributes = (el: Element) => {
      if (shouldSkipElement(el)) return;

      // 1. Placeholder on input/textarea
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const sourcePh = el.dataset.origStosPh || el.getAttribute("placeholder");
        if (sourcePh && /[a-zA-Z]/.test(sourcePh)) {
          if (!el.dataset.origStosPh) {
            el.dataset.origStosPh = sourcePh;
          }
          const translatedPh = autoTranslate(sourcePh, lang);
          if (translatedPh && translatedPh !== el.placeholder) {
            el.placeholder = translatedPh;
          }
        }
      }

      // 2. Title attribute
      const htmlEl = el as HTMLElement;
      const sourceTitle = htmlEl.dataset?.origStosTitle || el.getAttribute("title");
      if (sourceTitle && /[a-zA-Z]/.test(sourceTitle)) {
        if (htmlEl.dataset && !htmlEl.dataset.origStosTitle) {
          htmlEl.dataset.origStosTitle = sourceTitle;
        }
        const translatedTitle = autoTranslate(sourceTitle, lang);
        if (translatedTitle && translatedTitle !== el.getAttribute("title")) {
          el.setAttribute("title", translatedTitle);
        }
      }

      // 3. Aria-label attribute
      const sourceAria = htmlEl.dataset?.origStosAria || el.getAttribute("aria-label");
      if (sourceAria && /[a-zA-Z]/.test(sourceAria)) {
        if (htmlEl.dataset && !htmlEl.dataset.origStosAria) {
          htmlEl.dataset.origStosAria = sourceAria;
        }
        const translatedAria = autoTranslate(sourceAria, lang);
        if (translatedAria && translatedAria !== el.getAttribute("aria-label")) {
          el.setAttribute("aria-label", translatedAria);
        }
      }
    };

    const walkAndTranslate = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        processTextNode(root as Text);
        return;
      }
      if (root.nodeType === Node.ELEMENT_NODE) {
        processElementAttributes(root as Element);
      }
      const children = root.childNodes;
      for (let i = 0; i < children.length; i++) {
        walkAndTranslate(children[i]);
      }
    };

    const flushQueue = () => {
      scheduledFrame = null;
      if (pendingNodes.size === 0) return;
      const nodes = Array.from(pendingNodes);
      pendingNodes.clear();
      for (const node of nodes) {
        if (node.isConnected) {
          walkAndTranslate(node);
        }
      }
    };

    // Initial walk on document.body
    walkAndTranslate(document.body);

    const observer = new MutationObserver((mutations) => {
      if (isTranslating) return;
      for (const m of mutations) {
        if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
          pendingNodes.add(m.target);
        } else if (m.type === "childList") {
          for (let i = 0; i < m.addedNodes.length; i++) {
            pendingNodes.add(m.addedNodes[i]);
          }
        } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
          pendingNodes.add(m.target);
        }
      }

      if (pendingNodes.size > 0 && scheduledFrame === null) {
        scheduledFrame = requestAnimationFrame(flushQueue);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => {
      observer.disconnect();
      if (scheduledFrame !== null) {
        cancelAnimationFrame(scheduledFrame);
      }
    };
  }, [lang]);
}

export function IndicDomAutoTranslator() {
  useIndicDomAutoTranslator();
  return null;
}
