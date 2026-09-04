/** Cursor de digitação exibido no fim do texto em streaming (compartilhado entre o chat e os interpretadores). */
export function StreamCursor() {
  return (
    <>
      <span className="inline-block w-[2px] h-3.5 ml-0.5 align-[-2px] bg-primary animate-stream-cursor" />
      <span
        className="inline-flex items-baseline gap-0.5 ml-2 align-baseline text-primary/80"
        aria-label="digitando"
        role="status"
      >
        <span className="sr-only">digitando</span>
        <span className="animate-thinking-dot text-base leading-none">•</span>
        <span className="animate-thinking-dot [animation-delay:0.18s] text-base leading-none">•</span>
        <span className="animate-thinking-dot [animation-delay:0.36s] text-base leading-none">•</span>
      </span>
    </>
  );
}

export default StreamCursor;
