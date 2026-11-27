/** Splits text into word spans for the `words` scroll reveal, keeping the real spaces between them. */
export function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span className="w inline-block">{word}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}
