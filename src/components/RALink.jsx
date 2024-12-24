// https://tanstack.com/router/latest/docs/framework/react/guide/custom-link#react-aria-components-example
import { createLink } from '@tanstack/react-router';
import { forwardRef } from 'react';
import {
  mergeProps,
  useFocusRing,
  useHover,
  useLink,
  useObjectRef,
} from 'react-aria';

const RACLinkComponent = forwardRef((props, forwardedRef) => {
  const ref = useObjectRef(forwardedRef);

  const { isPressed, linkProps } = useLink(props, ref);
  const { isHovered, hoverProps } = useHover(props);
  const { isFocusVisible, isFocused, focusProps } = useFocusRing(props);

  return (
    <a
      {...mergeProps(linkProps, hoverProps, focusProps, props)}
      ref={ref}
      data-hovered={isHovered || undefined}
      data-pressed={isPressed || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-focused={isFocused || undefined}
    />
  );
});

const CreatedLinkComponent = createLink(RACLinkComponent);

const RALink = (props) => {
  return <CreatedLinkComponent preload={'intent'} {...props} />;
};

export default RALink;
