import { ReactRenderer } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import History from '@tiptap/extension-history';
import Mention from '@tiptap/extension-mention';
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  Fragment,
} from 'react';
import tippy from 'tippy.js';

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
      History,
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

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },

    onUpdate(props) {
      component.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup[0].setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown(props) {
      if (props.event.key === 'Escape') {
        popup[0].hide();

        return true;
      }

      return component.ref?.onKeyDown(props);
    },

    onExit() {
      popup[0].destroy();
      component.destroy();
    },
  };
}
