import { Node } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const HighlightRegex = Node.create({
  name: 'highlightRegex',

  addOptions() {
    return {
      rules: [], // Array of rules, each with regex, element, and className
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('highlightRegex'),
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations = [];
            const { rules } = this.options;

            // If no rules are provided, return null
            if (!Array.isArray(rules) || rules.length === 0) return null;

            doc.descendants((node, pos) => {
              if (!node.isText) return;

              const text = node.text;

              rules.forEach(
                ({ regex, element = 'span', className = 'highlight' }) => {
                  if (!regex) return;

                  let match;
                  while ((match = regex.exec(text)) !== null) {
                    const fullMatchStart = match.index;
                    const fullMatchEnd = fullMatchStart + match[0].length;

                    // Trim spaces around the match
                    const trimmedMatch = match[0].trim();
                    const startOffset = match[0].indexOf(trimmedMatch);
                    const trimmedStart = fullMatchStart + startOffset;
                    const trimmedEnd = trimmedStart + trimmedMatch.length;

                    // Create the decoration only for the trimmed match
                    decorations.push(
                      Decoration.inline(pos + trimmedStart, pos + trimmedEnd, {
                        class: className,
                        nodeName:
                          typeof element === 'string' ? element : 'span',
                        ...(typeof element !== 'string' && { element }), // Support custom React components
                      }),
                    );
                  }
                },
              );
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

export default HighlightRegex;
