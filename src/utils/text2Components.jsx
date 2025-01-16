import { RichText } from '@atproto/api';
import { Link } from '@tanstack/react-router';
import AuthorText from './../components/AuthorText';

export async function text2RichText2Components({ text, facets, agent }) {
  if (!text) return null;
  const rt = new RichText({ text: text.trim(), facets });
  await rt.detectFacets(agent);
  return text2Components({ text: rt });
}

const URL_MAX_LENGTH = 30;

export default function text2Components({ text, facets }) {
  if (!text) return null;
  const rt =
    text instanceof RichText
      ? text
      : new RichText({ text: text.trim(), facets });
  let keyIndex = 0;
  // console.debug('text2Components', { text, segments: [...rt.segments()] });
  const paragraphs = [];
  let paragraphChildren = [];
  // console.debug('SEGMENTS', {
  //   text,
  //   segments: [...rt.segments()],
  // });
  for (const segment of rt.segments()) {
    if (segment.isLink()) {
      // console.debug('LINK', segment);
      const { text, link } = segment;
      const { uri } = link;
      let linkText = text;
      const linkHasText = uri
        .toLowerCase()
        .includes(text.toLowerCase().replace(/(\.{3}|…)$/, ''));
      if (linkHasText) {
        // Split link into 3 components
        // E.g. https://www.google.com/longlongpath -> [<span className="invisible">https://www.</span>, <span className="ellipsis">google.com/longlon…</span>, <span className="invisible">gpath</span>]
        const [_, pre, __, rest] =
          uri.match(/(https?:\/\/(www\.)?)(.*)/i) || [];
        const preComponent = <span className="invisible">{pre}</span>;
        let midComponent;
        let postComponent = null;
        if (rest.length > URL_MAX_LENGTH) {
          const mid = rest.slice(0, URL_MAX_LENGTH);
          midComponent = <span className="ellipsis">{mid}</span>;
          const rest2 = rest.slice(URL_MAX_LENGTH);
          postComponent = <span className="invisible">{rest2}</span>;
        } else if (/\/$/.test(rest)) {
          const mid = rest.slice(0, rest.length - 1);
          midComponent = <span>{mid}</span>;
          postComponent = <span className="invisible">/</span>;
        } else {
          midComponent = <span>{rest}</span>;
        }
        linkText = [preComponent, midComponent, postComponent];
      }
      paragraphChildren.push(
        <a
          key={`${keyIndex++}-${segment.text}`}
          href={uri}
          target="_blank"
          className={`link ${linkHasText ? 'is-url' : ''}`}
          rel="noreferrer"
        >
          {linkText}
        </a>,
      );
    } else if (segment.isMention()) {
      // console.debug('MENTION', segment);
      const key = `${keyIndex++}-${segment.text}`;
      const did = segment.facet.features[0].did;
      const handle = segment.text.replace(/^@/, '');
      paragraphChildren.push(
        // <Link
        //   key={key}
        //   to={`/profile/${did}`}
        //   className="mention"
        // >
        //   <span className="symbol">@</span>
        //   <span className="text">{handle}</span>
        // </Link>,
        <AuthorText
          key={key}
          author={{
            did,
            handle,
          }}
          className="mention"
        >
          {({ niceDisplayHandle }) => (
            <>
              <span className="symbol">@</span>
              <span className="text">{niceDisplayHandle || handle}</span>
            </>
          )}
        </AuthorText>,
      );
    } else if (segment.isTag()) {
      // console.debug('TAG', segment);
      paragraphChildren.push(
        <Link
          key={`${keyIndex++}-${segment.text}`}
          to={`/tag/${encodeURIComponent(segment.tag.tag)}`}
          className="tag"
        >
          <span className="symbol">#</span>
          <span className="text">{segment.text.replace(/^#/, '')}</span>
        </Link>,
      );
    } else {
      if (/\n\n/.test(segment.text)) {
        const texts = segment.text.split(/[\n\r][\n\r]/g);
        for (let i = 0; i < texts.length; i++) {
          const text = texts[i];
          paragraphChildren.push(text);
          if (i < texts.length - 1) {
            // Do not close paragraph for last text
            paragraphs.push(
              <Block key={keyIndex++}>{paragraphChildren}</Block>,
            );
            paragraphChildren = []; // reset
          }
        }
      } else {
        paragraphChildren.push(segment.text);
      }
    }
  }

  paragraphs.push(<Block key={keyIndex++}>{paragraphChildren}</Block>);

  return paragraphs;
}

function Block({ children }) {
  return <p>{children}</p>;
}
