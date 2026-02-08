import React from 'react';

export const AsciiDivider = () => (
  <div className="w-full text-term-gray text-xs md:text-sm my-8 opacity-50 select-none overflow-hidden whitespace-nowrap">
    {"+-".repeat(100)}
  </div>
);

export const AsciiSkull = () => (
  <pre className="text-[10px] md:text-xs leading-[10px] md:leading-3 text-term-gray opacity-30 select-none">
{`
      .ed"""" """$$$$be.
    -"           ^""**$$$e.
  ."                   '$$$c
 /                      "$$$b
d                        $$$$
$  .                      $$$$
$  q.                     $$$$
$  '$                     $$$$
$   qe.                   $$$$
$   $ "b.                 $$$$
$   $   "b.               $$$$
$   $     "b.             $$$$
$   $       "b.           $$$$
$   $         "b.         $$$$
$   $           "b.       $$$$
$   $             "b.     $$$$
$   $               "b.   $$$$
$   $                 "b. $$$$
$   $                   "b.$$$
$   $                     "$$$
$   $                      "$$
$   $                       "$
`}
  </pre>
);

export const LoadingSpinner = () => {
  const [frame, setFrame] = React.useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-white inline-block w-4">{frames[frame]}</span>;
};
