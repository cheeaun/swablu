import { useRef, useLayoutEffect } from 'react';

export default function Bar(props) {
  const { as, ...otherProps } = props;
  const barRef = useRef(null);

  useLayoutEffect(() => {
    if (barRef.current) {
      const barHeight = barRef.current.offsetHeight;
      document.documentElement.style.setProperty(
        '--bar-height',
        `${barHeight}px`,
      );
    }
    return () => {
      document.documentElement.style.removeProperty('--bar-height');
    };
  }, []);

  const Component = as || 'div';

  return <Component ref={barRef} {...otherProps} />;
}
