import { computePosition, flip, shift } from '@floating-ui/dom';
import { posToDOMRect, ReactRenderer } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import Mention from '@tiptap/extension-mention';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  Fragment,
} from 'react';

import { TAG_REGEX, URL_REGEX } from '@atproto/api';
import AuthorText from './AuthorText';
import HighlightRegex from './HighlightRegex';

// Force hard break when pressing enter
const CustomHardBreak = HardBreak.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.setHardBreak(),
    };
  },
});

export default function Editor({
  defaultText = '',
  disabled,
  autofocus,
  placeholder = null,
  items = () => [],
  onUpdate,
}) {
  const editor = useEditor({
    editable: !disabled,
    autofocus: autofocus || 'end',
    onUpdate,
    extensions: [
      Document,
      Paragraph,
      CustomHardBreak,
      Text,
      UndoRedo,
      HighlightRegex.configure({
        rules: [
          {
            regex: TAG_REGEX,
            className: 'tag',
          },
          {
            regex: URL_REGEX,
            className: 'link',
          },
        ],
      }),
      Mention.configure({
        suggestion: {
          items,
          render,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: `<p>${defaultText}</p>`,
  });

  return (
    <div className="editor">
      <EditorContent editor={editor} />
    </div>
  );
}

const MentionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index) => {
    const item = props.items[index];

    if (item) {
      props.command({ id: item?.handle || item });
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="editor-dropdown-menu">
      {
        props.items.length
          ? props.items.map((item, index) => (
              <button
                type="button"
                className={index === selectedIndex ? 'is-selected' : ''}
                key={item?.did || index}
                onClick={() => selectItem(index)}
              >
                {typeof item === 'string' ? (
                  item
                ) : (
                  <AuthorText
                    author={item}
                    as={Fragment}
                    showName
                    showAvatar
                    noTooltip
                  />
                )}
              </button>
            ))
          : null
        // <div className="item">No result</div>
      }
    </div>
  );
});

const updatePosition = (editor, element) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to,
      ),
  };

  computePosition(virtualElement, element, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = 'max-content';
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
};

function render() {
  let component;
  let popup;

  return {
    onStart: (props) => {
      component = new ReactRenderer(MentionList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      component.element.style.position = 'absolute';

      document.body.appendChild(component.element);

      updatePosition(props.editor, component.element);
    },

    onUpdate(props) {
      component.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      updatePosition(props.editor, component.element);
    },

    onKeyDown(props) {
      if (props.event.key === 'Escape') {
        component.destroy();

        return true;
      }

      return component.ref?.onKeyDown(props);
    },

    onExit() {
      component.element.remove();
      component.destroy();
    },
  };
}
