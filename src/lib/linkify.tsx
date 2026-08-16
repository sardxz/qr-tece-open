import React from "react";

// Captura URLs http(s):// e www. — como o match e' ganancioso ate' o espaco,
// fragmentos (#secao) ficam dentro da URL e nao sao confundidos com hashtag.
export const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function isUrl(s: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(s);
}

export function UrlLink({ raw }: { raw: string }) {
  // Pontuacao final ("veja https://x.com.") nao faz parte da URL.
  const m = raw.match(/^(.*?)([.,;:!?)\]]*)$/);
  const url = m ? m[1] : raw;
  const trailing = m ? m[2] : "";
  const href = url.toLowerCase().startsWith("http") ? url : `https://${url}`;
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="font-medium underline break-all"
        style={{ color: "var(--color-tece-600)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
      {trailing}
    </>
  );
}

export function linkifyPlain(text: string): React.ReactNode {
  return text
    .split(URL_REGEX)
    .map((part, i) =>
      part && isUrl(part) ? (
        <UrlLink key={i} raw={part} />
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
}
