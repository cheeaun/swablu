import { Trans } from '@lingui/react/macro';
import { IconPinned, IconRepeat } from '@tabler/icons-react';
import AuthorText from './AuthorText';

export default function RichReason({ reason }) {
  if (!reason?.$type) return null;
  if (/#reasonRepost/i.test(reason.$type)) {
    return (
      <div className="post-reason post-reason-repost">
        <IconRepeat size={16} /> <AuthorText author={reason.by} showAvatar />
      </div>
    );
  }
  if (/#reasonPin/i.test(reason.$type)) {
    return (
      <div className="post-reason post-reason-pin">
        <IconPinned size={16} />{' '}
        <span>
          <Trans>Pinned</Trans>
        </span>
      </div>
    );
  }
  return null;
}
