import { useNavigate, useRouter } from '@tanstack/react-router';

import { IconChevronLeft } from '@tabler/icons-react';

export default function BackButton() {
  const router = useRouter();
  const { history } = router;
  const navigate = useNavigate();
  // console.log('BACK BUTTON', { router, history });
  return (
    <button
      className="back-button"
      type="button"
      onClick={() => {
        if (history.length > 1) {
          history.back();
        } else {
          navigate({ to: '/' });
        }
      }}
    >
      <IconChevronLeft size={16} />
    </button>
  );
}
